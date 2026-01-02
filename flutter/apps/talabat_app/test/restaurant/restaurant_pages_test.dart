import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:talabat_app/src/features/restaurant/pages/category_manager_page.dart';
import 'package:talabat_app/src/features/restaurant/pages/restaurant_order_detail_page.dart';
import 'package:talabat_app/src/features/restaurant/pages/restaurant_performance_page.dart';
import 'package:talabat_app/src/features/restaurant/pages/restaurant_settings_page.dart';

void main() {
  testWidgets('performance page renders KPI cards', (tester) async {
    final repo = _FakeRestaurantRepository()
      ..summary = RestaurantPerformanceSummary(
        fulfillmentRate: 0.92,
        averagePrepMinutes: 18,
        ordersToday: 42,
        trustedArrivalTrend: const [],
      );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          restaurantRepositoryProvider.overrideWithValue(repo),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: RestaurantPerformancePage(restaurantIdOverride: 'rest-1')),
      ),
    );

    await tester.pump();
    expect(find.textContaining('Fulfillment rate'), findsOneWidget);
    expect(find.textContaining('Orders today'), findsOneWidget);
  });

  testWidgets('category manager reorder triggers repository call', (tester) async {
    final repo = _FakeRestaurantRepository()
      ..categories = [
        const RestaurantCategory(id: 'cat-1', name: 'Wraps', sortOrder: 0),
        const RestaurantCategory(id: 'cat-2', name: 'Desserts', sortOrder: 1),
      ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          restaurantRepositoryProvider.overrideWithValue(repo),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: CategoryManagerPage(restaurantIdOverride: 'rest-1')),
      ),
    );

    await tester.pump();
    final list = tester.widget<ReorderableListView>(find.byType(ReorderableListView));
    list.onReorder?.call(0, 2);
    expect(repo.reorderCalled, isTrue);
    expect(repo.reorderedIds, ['cat-2', 'cat-1']);
  });

  testWidgets('settings page saves updates', (tester) async {
    final repo = _FakeRestaurantRepository()
      ..settings = RestaurantSettings(
        restaurantId: 'rest-1',
        hours: const {'mon': HoursRange(open: '08:00', close: '22:00')},
        latitude: null,
        longitude: null,
        staff: const [],
      );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          restaurantRepositoryProvider.overrideWithValue(repo),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: RestaurantSettingsPage(restaurantIdOverride: 'rest-1')),
      ),
    );

    await tester.pump();
    await tester.tap(find.text('Save settings'));
    await tester.pump();
    expect(repo.settingsSaved, isTrue);
  });

  testWidgets('order detail actions call repository', (tester) async {
    final repo = _FakeRestaurantRepository()
      ..orderDetail = RestaurantOrderDetail(
        id: 'order-1',
        status: 'pending',
        timeline: const [RestaurantTimelineEntry(label: 'Pending', timestamp: null, completed: false)],
        customerName: 'Ali',
        customerPhone: '0100',
        items: const [OrderLineItem(name: 'Koshary', quantity: 1)],
        total: 120,
        driverName: 'Sara',
      );

    final router = GoRouter(routes: [
      GoRoute(path: '/', builder: (context, state) => RestaurantOrderDetailPage(orderId: 'order-1')),
    ]);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          restaurantRepositoryProvider.overrideWithValue(repo),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );

    await tester.pump();
    await tester.tap(find.text('Hold order'));
    await tester.pump();
    expect(repo.lastAction, 'hold');
  });
}

class _FakeRestaurantRepository extends RestaurantRepository {
  _FakeRestaurantRepository() : super(SupabaseClient('http://localhost', 'anon-key'));

  RestaurantPerformanceSummary? summary;
  List<RestaurantCategory> categories = const [];
  RestaurantSettings? settings;
  RestaurantOrderDetail? orderDetail;
  bool reorderCalled = false;
  List<String>? reorderedIds;
  bool settingsSaved = false;
  String? lastAction;

  @override
  Future<RestaurantPerformanceSummary> fetchPerformanceSummary(String restaurantId) async => summary!;

  @override
  Future<List<RestaurantCategory>> fetchCategories(String restaurantId) async => categories;

  @override
  Future<void> reorderCategories(List<String> orderedCategoryIds) async {
    reorderCalled = true;
    reorderedIds = orderedCategoryIds;
  }

  @override
  Future<RestaurantSettings> fetchSettings(String restaurantId) async => settings!;

  @override
  Future<void> saveSettings(RestaurantSettings settings) async {
    settingsSaved = true;
  }

  @override
  Future<RestaurantOrderDetail> fetchOrderDetail(String orderId) async => orderDetail!;

  @override
  Future<void> performOrderAction({required String orderId, required String action}) async {
    lastAction = action;
  }
}
