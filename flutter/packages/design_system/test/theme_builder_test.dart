import 'package:design_system/design_system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Theme builder generates light and dark themes', () {
    final builder = TalabatThemeBuilder();
    final light = builder.build();
    final dark = builder.build(darkMode: true);

    expect(light.scaffoldBackgroundColor, isNot(equals(dark.scaffoldBackgroundColor)));
    expect(light.textTheme.displayLarge?.fontFamily, dark.textTheme.displayLarge?.fontFamily);
  });
}
