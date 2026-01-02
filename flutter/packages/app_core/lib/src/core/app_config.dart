class AppConfig {
  AppConfig._();

  static final supabaseUrl = const String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static final supabaseAnonKey = const String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  static void validate() {
    if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
      throw StateError('Supabase credentials are missing. Provide SUPABASE_URL and SUPABASE_ANON_KEY.');
    }
  }
}
