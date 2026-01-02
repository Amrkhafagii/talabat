import 'package:supabase_flutter/supabase_flutter.dart';

enum UserRole { customer, restaurant, delivery, admin }

class AppAuthState {
  const AppAuthState({
    required this.loading,
    this.session,
    this.userRole,
    this.user,
    this.error,
  });

  factory AppAuthState.loading() => const AppAuthState(loading: true);

  final bool loading;
  final Session? session;
  final UserRole? userRole;
  final User? user;
  final String? error;

  bool get isAuthenticated => session != null && user != null;

  AppAuthState copyWith({
    bool? loading,
    Session? session,
    UserRole? userRole,
    User? user,
    String? error,
  }) {
    return AppAuthState(
      loading: loading ?? this.loading,
      session: session ?? this.session,
      userRole: userRole ?? this.userRole,
      user: user ?? this.user,
      error: error,
    );
  }
}
