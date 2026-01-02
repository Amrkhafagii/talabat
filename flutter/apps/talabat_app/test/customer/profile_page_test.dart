import 'dart:typed_data';

import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:talabat_app/src/features/customer/pages/customer_profile_page.dart';

void main() {
  testWidgets('profile form validation + save flow', (tester) async {
    final fakeRepository = _FakeProfileRepository();
    var refreshCalled = false;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          customerProfileProvider.overrideWith((ref) => AsyncValue.data(fakeRepository.profile)),
          customerProfileRepositoryProvider.overrideWithValue(fakeRepository),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
          authRefreshProvider.overrideWithValue(() async {
            refreshCalled = true;
          }),
        ],
        child: const MaterialApp(home: CustomerProfilePage()),
      ),
    );

    await tester.enterText(find.byType(TextField).at(0), 'New Name');
    await tester.enterText(find.byType(TextField).at(1), '0123');
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(fakeRepository.lastUpdate?.name, 'New Name');
    expect(fakeRepository.lastUpdate?.phone, '0123');
    expect(refreshCalled, isTrue);
  });
}

class _FakeProfileRepository implements CustomerProfileRepository {
  _FakeProfileRepository();

  final profile = const CustomerProfile(id: 'user-1', email: 'test@talabat.com', name: 'Test User', phone: '0100');
  CustomerProfileUpdate? lastUpdate;

  @override
  Future<CustomerProfile> fetchProfile(String userId) async => profile;

  @override
  Future<String> uploadAvatar({required String userId, required Uint8List bytes, String mimeType = 'image/jpeg'}) {
    throw UnimplementedError();
  }

  @override
  Future<CustomerProfile> updateProfile(String userId, CustomerProfileUpdate update) async {
    lastUpdate = update;
    return profile;
  }
}
