import 'package:flutter_test/flutter_test.dart';
import 'package:talabat_app/src/routing/app_router.dart';

import 'package:hooks_riverpod/hooks_riverpod.dart';

void main() {
  test('router initializes', () {
    final container = ProviderContainer(overrides: []);
    final router = container.read(appRouterProvider);
    expect(router.initialLocation, '/customer');
  });
}
