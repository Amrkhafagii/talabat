import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../features/admin/pages/admin_dashboard_page.dart';
import '../features/admin/pages/admin_orders_page.dart';
import '../features/admin/pages/admin_payouts_page.dart';
import '../features/admin/pages/admin_reviews_page.dart';
import '../features/admin/pages/admin_settings_page.dart';
import '../features/auth/pages/login_page.dart';
import '../features/auth/pages/signup_page.dart';
import '../features/customer/pages/customer_home_page.dart';
import '../features/customer/pages/cart_page.dart';
import '../features/customer/pages/checkout_page.dart';
import '../features/customer/pages/order_status_page.dart';
import '../features/customer/pages/payment_proof_page.dart';
import '../features/customer/pages/restaurant_detail_page.dart';
import '../features/customer/pages/wallet_page.dart';
import '../features/customer/pages/address_list_page.dart';
import '../features/customer/pages/add_edit_address_page.dart';
import '../features/customer/pages/customer_profile_page.dart';
import '../features/delivery/pages/delivery_dashboard_page.dart';
import '../features/delivery/pages/delivery_navigation_page.dart';
import '../features/delivery/pages/cash_reconciliation_page.dart';
import '../features/delivery/pages/delivery_incident_page.dart';
import '../features/delivery/pages/delivery_earnings_page.dart';
import '../features/delivery/pages/delivery_history_page.dart';
import '../features/delivery/pages/delivery_wallet_page.dart';
import '../features/delivery/pages/delivery_feedback_page.dart';
import '../features/delivery/pages/delivery_profile_page.dart';
import '../features/restaurant/pages/restaurant_dashboard_page.dart';
import '../features/restaurant/pages/restaurant_performance_page.dart';
import '../features/restaurant/pages/restaurant_metrics_page.dart';
import '../features/restaurant/pages/category_manager_page.dart';
import '../features/restaurant/pages/restaurant_order_detail_page.dart';
import '../features/restaurant/pages/restaurant_settings_page.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  return GoRouter(
    initialLocation: '/customer',
    refreshListenable: auth,
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => _TabsShell(child: child),
        routes: [
          GoRoute(
            path: '/customer',
            builder: (context, state) => const CustomerHomePage(),
          ),
          GoRoute(
            path: '/customer/restaurant/:id',
            builder: (context, state) => RestaurantDetailPage(restaurantId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/customer/cart',
            builder: (context, state) => const CartPage(),
          ),
          GoRoute(
            path: '/customer/addresses',
            builder: (context, state) => const AddressListPage(),
          ),
          GoRoute(
            path: '/customer/addresses/new',
            builder: (context, state) => const AddEditAddressPage(),
          ),
          GoRoute(
            path: '/customer/addresses/:addressId/edit',
            builder: (context, state) => AddEditAddressPage(addressId: state.pathParameters['addressId']),
          ),
          GoRoute(
            path: '/customer/profile',
            builder: (context, state) => const CustomerProfilePage(),
          ),
          GoRoute(
            path: '/customer/checkout',
            builder: (context, state) => const CheckoutPage(),
          ),
          GoRoute(
            path: '/customer/orders/:orderId',
            builder: (context, state) => OrderStatusPage(orderId: state.pathParameters['orderId']!),
          ),
          GoRoute(
            path: '/customer/wallet',
            builder: (context, state) => const WalletPage(),
          ),
          GoRoute(
            path: '/customer/payment-proof',
            builder: (context, state) => PaymentProofPage(orderId: state.uri.queryParameters['orderId'] ?? ''),
          ),
          GoRoute(
            path: '/restaurant',
            builder: (context, state) => const RestaurantDashboardPage(),
          ),
          GoRoute(
            path: '/restaurant/performance',
            builder: (context, state) => const RestaurantPerformancePage(),
          ),
          GoRoute(
            path: '/restaurant/metrics',
            builder: (context, state) => const RestaurantMetricsPage(),
          ),
          GoRoute(
            path: '/restaurant/categories',
            builder: (context, state) => const CategoryManagerPage(),
          ),
          GoRoute(
            path: '/restaurant/orders/:orderId',
            builder: (context, state) => RestaurantOrderDetailPage(orderId: state.pathParameters['orderId']!),
          ),
          GoRoute(
            path: '/restaurant/settings',
            builder: (context, state) => const RestaurantSettingsPage(),
          ),
          GoRoute(
            path: '/delivery',
            builder: (context, state) => const DeliveryDashboardPage(),
          ),
          GoRoute(
            path: '/delivery/navigation',
            builder: (context, state) => const DeliveryNavigationPage(),
          ),
          GoRoute(
            path: '/delivery/cash',
            builder: (context, state) => const CashReconciliationPage(),
          ),
          GoRoute(
            path: '/delivery/incident/:deliveryId',
            builder: (context, state) => DeliveryIncidentPage(deliveryId: state.pathParameters['deliveryId']!),
          ),
          GoRoute(
            path: '/delivery/earnings',
            builder: (context, state) => const DeliveryEarningsPage(),
          ),
          GoRoute(
            path: '/delivery/history',
            builder: (context, state) => const DeliveryHistoryPage(),
          ),
          GoRoute(
            path: '/delivery/wallet',
            builder: (context, state) => const DeliveryWalletPage(),
          ),
          GoRoute(
            path: '/delivery/profile',
            builder: (context, state) => const DeliveryProfilePage(),
          ),
          GoRoute(
            path: '/delivery/feedback',
            builder: (context, state) => const DeliveryFeedbackPage(),
          ),
        ],
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboardPage(),
      ),
      GoRoute(
        path: '/admin/orders',
        builder: (context, state) => const AdminOrdersPage(),
      ),
      GoRoute(
        path: '/admin/payouts',
        builder: (context, state) => const AdminPayoutsPage(),
      ),
      GoRoute(
        path: '/admin/reviews',
        builder: (context, state) => const AdminReviewsPage(),
      ),
      GoRoute(
        path: '/admin/settings',
        builder: (context, state) => const AdminSettingsPage(),
      ),
    ],
    redirect: (context, state) {
      final authState = auth.state;
      final loggingIn = state.matchedLocation == '/login';
      if (!authState.isAuthenticated && !loggingIn) {
        return '/login';
      }
      if (authState.isAuthenticated && loggingIn) {
        return _defaultRouteForRole(authState.userRole);
      }
      if (state.matchedLocation.startsWith('/admin') && authState.userRole != UserRole.admin) {
        return '/customer';
      }
      return null;
    },
  );
});

class _TabsShell extends StatelessWidget {
  const _TabsShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _indexForLocation(GoRouterState.of(context).uri.toString()),
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/customer');
              break;
            case 1:
              context.go('/restaurant');
              break;
            case 2:
              context.go('/delivery');
              break;
          }
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Customer'),
          NavigationDestination(icon: Icon(Icons.restaurant), label: 'Restaurant'),
          NavigationDestination(icon: Icon(Icons.delivery_dining), label: 'Delivery'),
        ],
      ),
    );
  }

  int _indexForLocation(String location) {
    if (location.startsWith('/restaurant')) return 1;
    if (location.startsWith('/delivery')) return 2;
    return 0;
  }
}

String _defaultRouteForRole(UserRole? role) {
  switch (role) {
    case UserRole.restaurant:
      return '/restaurant';
    case UserRole.delivery:
      return '/delivery';
    case UserRole.admin:
      return '/admin';
    case UserRole.customer:
    default:
      return '/customer';
  }
}
