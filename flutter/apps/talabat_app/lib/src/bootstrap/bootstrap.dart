import 'dart:ui';

import 'package:app_core/app_core.dart';
import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../routing/app_router.dart';
import '../theme/app_theme.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseManager.init();
  final analytics = AnalyticsService(SupabaseManager.client);
  FlutterError.onError = (details) async {
    FlutterError.presentError(details);
    await analytics.recordCrash(error: details.exception, stack: details.stack ?? StackTrace.empty);
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    analytics.recordCrash(error: error, stack: stack);
    return false;
  };

  runApp(
    ProviderScope(
      overrides: [
        analyticsServiceProvider.overrideWithValue(analytics),
      ],
      child: const TalabatApp(),
    ),
  );
}

class TalabatApp extends ConsumerWidget {
  const TalabatApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appRouter = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'Talabat Flutter',
      theme: TalabatAppTheme.light,
      darkTheme: TalabatAppTheme.dark,
      routerConfig: appRouter,
    );
  }
}
