import 'dart:async';

import 'package:app_core/app_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import '../push/push_registration_service.dart';
import 'auth_state.dart';

final authControllerProvider = ChangeNotifierProvider<AuthController>((ref) {
  final controller = AuthController(
    supabase: ref.watch(supabaseProvider),
    pushService: ref.watch(pushRegistrationServiceProvider),
  );
  ref.onDispose(controller.dispose);
  return controller;
});

final authStateProvider = Provider<AppAuthState>((ref) => ref.watch(authControllerProvider).state);
final authRefreshProvider = Provider<Future<void> Function()>((ref) {
  return () => ref.read(authControllerProvider).refreshUser();
});

class AuthController extends ChangeNotifier {
  AuthController({required supabase.SupabaseClient supabase, required PushRegistrationService pushService})
      : _supabase = supabase,
        _pushService = pushService {
    _init();
  }

  final supabase.SupabaseClient _supabase;
  final PushRegistrationService _pushService;
  late StreamSubscription<supabase.AuthState> _authSubscription;
  AppAuthState _state = AppAuthState.loading();

  AppAuthState get state => _state;

  Future<void> _init() async {
    final currentSession = await _supabase.auth.getSession();
    if (currentSession.session != null) {
      final role = await _deriveUserRole(currentSession.session!.user);
      _setState(_state.copyWith(loading: false, session: currentSession.session, user: currentSession.session!.user, userRole: role));
      await _pushService.registerToken(currentSession.session!.user.id);
    } else {
      _setState(_state.copyWith(loading: false));
    }

    _authSubscription = _supabase.auth.onAuthStateChange.listen((data) async {
      final session = data.session;
      if (session?.user != null) {
        final role = await _deriveUserRole(session!.user);
        _setState(AppAuthState(loading: false, session: session, user: session.user, userRole: role));
        await _pushService.registerToken(session.user.id);
      } else {
        _setState(AppAuthState(loading: false));
      }
    });
  }

  Future<UserRole?> _deriveUserRole(supabase.User? sessionUser) async {
    if (sessionUser == null) return null;
    final metadata = sessionUser.appMetadata['user_type'] ?? sessionUser.userMetadata['user_type'];
    final parsed = _parseRole(metadata);
    if (parsed != null) return parsed;

    final response = await _supabase
        .from('users')
        .select('user_type')
        .eq('id', sessionUser.id)
        .maybeSingle();
    final fallback = (response as Map<String, dynamic>?)?['user_type'];
    return _parseRole(fallback) ?? UserRole.customer;
  }

  UserRole? _parseRole(dynamic value) {
    if (value is String) {
      switch (value) {
        case 'customer':
          return UserRole.customer;
        case 'restaurant':
          return UserRole.restaurant;
        case 'delivery':
          return UserRole.delivery;
        case 'admin':
          return UserRole.admin;
      }
    }
    return null;
  }

  Future<supabase.AuthResponse> signIn({required String email, required String password}) {
    return _supabase.auth.signInWithPassword(email: email, password: password);
  }

  Future<supabase.AuthResponse> signUp({
    required String email,
    required String password,
    required UserRole userRole,
    Map<String, dynamic>? extraMetadata,
  }) {
    return _supabase.auth.signUp(
      email: email,
      password: password,
      data: {
        'user_type': describeEnum(userRole),
        ...?extraMetadata,
      },
    );
  }

  Future<void> signOut() async {
    await FirebaseMessaging.instance.deleteToken().catchError((_) => null);
    await _supabase.auth.signOut();
    _setState(AppAuthState(loading: false));
  }

  Future<void> refreshUser() async {
    final sessionResponse = await _supabase.auth.getSession();
    final session = sessionResponse.session;
    if (session?.user != null) {
      final role = await _deriveUserRole(session!.user);
      _setState(AppAuthState(loading: false, session: session, user: session.user, userRole: role));
    }
  }

  void _setState(AppAuthState next) {
    _state = next;
    notifyListeners();
  }

  @override
  void dispose() {
    _authSubscription.cancel();
    super.dispose();
  }
}
