import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'tokens.dart';

class TalabatThemeBuilder {
  const TalabatThemeBuilder();

  ThemeData build({bool darkMode = false}) {
    final colors = darkMode ? TalabatColors.dark() : TalabatColors.light();
    final textTheme = _textTheme(colors);

    return ThemeData(
      useMaterial3: true,
      colorScheme: _colorScheme(colors, darkMode),
      scaffoldBackgroundColor: colors.palette.background,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.palette.surface,
        foregroundColor: colors.palette.text,
        elevation: 0,
      ),
      cardTheme: CardTheme(
        color: colors.palette.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(TalabatColors.radii.card),
        ),
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.all(colors.palette.accent),
          foregroundColor: WidgetStateProperty.all(colors.palette.textInverse),
          padding: WidgetStateProperty.all(
            EdgeInsets.symmetric(
              horizontal: TalabatColors.spacing.lg,
              vertical: TalabatColors.spacing.sm,
            ),
          ),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(TalabatColors.radii.cta),
            ),
          ),
        ),
      ),
    );
  }

  TextTheme _textTheme(TalabatColors colors) {
    return GoogleFonts.interTextTheme().copyWith(
      displayLarge: TalabatColors.typography.titleXl.copyWith(color: colors.palette.text),
      displayMedium: TalabatColors.typography.titleL.copyWith(color: colors.palette.text),
      headlineSmall: TalabatColors.typography.titleM.copyWith(color: colors.palette.text),
      bodyLarge: TalabatColors.typography.body.copyWith(color: colors.palette.text),
      bodyMedium: TalabatColors.typography.subhead.copyWith(color: colors.palette.textMuted),
      bodySmall: TalabatColors.typography.caption.copyWith(color: colors.palette.textSubtle),
      labelLarge: TalabatColors.typography.button.copyWith(color: colors.palette.textInverse),
      labelMedium: TalabatColors.typography.buttonSmall.copyWith(color: colors.palette.textInverse),
    );
  }

  ColorScheme _colorScheme(TalabatColors colors, bool darkMode) {
    final palette = colors.palette;
    return ColorScheme(
      brightness: darkMode ? Brightness.dark : Brightness.light,
      primary: colors.primaryRamp.shade500,
      onPrimary: palette.textInverse,
      secondary: palette.accent,
      onSecondary: palette.textInverse,
      error: palette.error,
      onError: palette.textInverse,
      background: palette.background,
      onBackground: palette.text,
      surface: palette.surface,
      onSurface: palette.text,
    );
  }
}
