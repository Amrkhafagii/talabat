import 'package:flutter/material.dart';

/// Color ramps derived from styles/appTheme.tsx.
class TalabatColors {
  TalabatColors.light()
      : palette = _Palette(
          background: const Color(0xFFF8F5F0),
          surface: Colors.white,
          surfaceAlt: const Color(0xFFF2ECE3),
          surfaceStrong: const Color(0xFFFFF9F3),
          border: const Color(0xFFE5D9CB),
          borderMuted: const Color(0xFFEDE3D7),
          text: const Color(0xFF1F140C),
          textMuted: const Color(0xFF524437),
          textSubtle: const Color(0xFF74675A),
          textInverse: Colors.white,
          secondaryText: const Color(0xFF382F2B),
          mutedText: const Color(0xFF8A7C6F),
          formSurface: Colors.white,
          formSurfaceAlt: const Color(0xFFF4EEE4),
          formBorder: const Color(0xFFE5D9CB),
          formPlaceholder: const Color(0xFF9B8D80),
          formText: const Color(0xFF22160E),
          accent: const Color(0xFFF58220),
          accentStrong: const Color(0xFFE26F0B),
          accentSoft: const Color(0xFFFFE8D6),
          success: const Color(0xFF2CB164),
          warning: const Color(0xFFF0A417),
          error: const Color(0xFFD64545),
          info: const Color(0xFF2F6FE4),
          positive: const Color(0xFF2CB164),
          pill: const Color(0xFFF0E5D8),
          overlay: const Color(0x14120C08),
        ),
        primaryRamp = const _PrimaryRamp(
          shade25: Color(0xFFFFF9F2),
          shade50: Color(0xFFFFE8D6),
          shade100: Color(0xFFFFDDB8),
          shade500: Color(0xFFF58220),
          shade600: Color(0xFFE26F0B),
        ),
        statusSoft = const _StatusSet(
          success: Color(0xFFEAF7EF),
          warning: Color(0xFFFFF5E5),
          error: Color(0xFFFFE9E7),
          info: Color(0xFFE8F0FF),
        );

  TalabatColors.dark()
      : palette = _Palette(
          background: const Color(0xFF15100C),
          surface: const Color(0xFF1D1711),
          surfaceAlt: const Color(0xFF231B14),
          surfaceStrong: const Color(0xFF1F1912),
          border: const Color(0xFF33271D),
          borderMuted: const Color(0xFF3D2F22),
          text: const Color(0xFFF6EDE3),
          textMuted: const Color(0xFFD4C7BA),
          textSubtle: const Color(0xFFB39E8D),
          textInverse: const Color(0xFF1A120C),
          secondaryText: const Color(0xFFE8DDCF),
          mutedText: const Color(0xFFCBB9A8),
          formSurface: const Color(0xFF201910),
          formSurfaceAlt: const Color(0xFF241C13),
          formBorder: const Color(0xFF3D2F22),
          formPlaceholder: const Color(0xFFA38F7D),
          formText: const Color(0xFFF6EDE3),
          accent: const Color(0xFFFF9C42),
          accentStrong: const Color(0xFFF58220),
          accentSoft: const Color(0xFF2C261F),
          success: const Color(0xFF40C37A),
          warning: const Color(0xFFF4B744),
          error: const Color(0xFFF2857A),
          info: const Color(0xFF85AFFF),
          positive: const Color(0xFF40C37A),
          pill: const Color(0xFF2B2118),
          overlay: const Color(0x73000000),
        ),
        primaryRamp = const _PrimaryRamp(
          shade25: Color(0xFF1E1A16),
          shade50: Color(0xFF2C261F),
          shade100: Color(0xFF3A3127),
          shade500: Color(0xFFFF9C42),
          shade600: Color(0xFFF58220),
        ),
        statusSoft = const _StatusSet(
          success: Color(0x2922C55E),
          warning: Color(0x29FBBF24),
          error: Color(0x29F87171),
          info: Color(0x295AC8FA),
        );

  final _Palette palette;
  final _PrimaryRamp primaryRamp;
  final _StatusSet statusSoft;

  static const spacing = _Spacing();
  static const radii = _Radii();
  static const typography = _Typography();
  static const iconSizes = _IconSizes();
}

class _Palette {
  const _Palette({
    required this.background,
    required this.surface,
    required this.surfaceAlt,
    required this.surfaceStrong,
    required this.border,
    required this.borderMuted,
    required this.text,
    required this.textMuted,
    required this.textSubtle,
    required this.textInverse,
    required this.secondaryText,
    required this.mutedText,
    required this.formSurface,
    required this.formSurfaceAlt,
    required this.formBorder,
    required this.formPlaceholder,
    required this.formText,
    required this.accent,
    required this.accentStrong,
    required this.accentSoft,
    required this.success,
    required this.warning,
    required this.error,
    required this.info,
    required this.positive,
    required this.pill,
    required this.overlay,
  });

  final Color background;
  final Color surface;
  final Color surfaceAlt;
  final Color surfaceStrong;
  final Color border;
  final Color borderMuted;
  final Color text;
  final Color textMuted;
  final Color textSubtle;
  final Color textInverse;
  final Color secondaryText;
  final Color mutedText;
  final Color formSurface;
  final Color formSurfaceAlt;
  final Color formBorder;
  final Color formPlaceholder;
  final Color formText;
  final Color accent;
  final Color accentStrong;
  final Color accentSoft;
  final Color success;
  final Color warning;
  final Color error;
  final Color info;
  final Color positive;
  final Color pill;
  final Color overlay;
}

class _PrimaryRamp {
  const _PrimaryRamp({
    required this.shade25,
    required this.shade50,
    required this.shade100,
    required this.shade500,
    required this.shade600,
  });

  final Color shade25;
  final Color shade50;
  final Color shade100;
  final Color shade500;
  final Color shade600;
}

class _StatusSet {
  const _StatusSet({
    required this.success,
    required this.warning,
    required this.error,
    required this.info,
  });

  final Color success;
  final Color warning;
  final Color error;
  final Color info;
}

class _Spacing {
  const _Spacing();

  double get xxs => 4;
  double get xs => 8;
  double get sm => 12;
  double get md => 16;
  double get lg => 20;
  double get xl => 26;
  double get xl2 => 34;
}

class _Radii {
  const _Radii();

  double get sm => 12;
  double get md => 16;
  double get lg => 20;
  double get xl => 28;
  double get pill => 999;
  double get card => 20;
  double get cta => 18;
}

class _Typography {
  const _Typography();

  TextStyle get titleXl => _textStyle(28, FontWeight.w700);
  TextStyle get titleL => _textStyle(24, FontWeight.w700);
  TextStyle get titleM => _textStyle(20, FontWeight.w600);
  TextStyle get body => _textStyle(16, FontWeight.w400);
  TextStyle get subhead => _textStyle(14, FontWeight.w500);
  TextStyle get caption => _textStyle(12, FontWeight.w400);
  TextStyle get button => _textStyle(16, FontWeight.w600);
  TextStyle get buttonSmall => _textStyle(14, FontWeight.w600);

  TextStyle _textStyle(double size, FontWeight weight) {
    return TextStyle(fontSize: size, fontWeight: weight, height: 1.25);
  }
}

class _IconSizes {
  const _IconSizes();

  double get sm => 16;
  double get md => 20;
  double get lg => 24;
  double get xl => 30;
}
