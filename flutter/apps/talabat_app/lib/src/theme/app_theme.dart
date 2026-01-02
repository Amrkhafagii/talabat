import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';

class TalabatAppTheme {
  static final _builder = TalabatThemeBuilder();

  static ThemeData get light => _builder.build();
  static ThemeData get dark => _builder.build(darkMode: true);
}
