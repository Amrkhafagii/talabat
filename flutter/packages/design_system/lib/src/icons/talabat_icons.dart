import 'package:flutter/widgets.dart';

/// Placeholder icon set – replace with custom icon font when assets are ready.
class TalabatIcons {
  const TalabatIcons._();

  static const IconData home = IconsProxy(0xe000);
  static const IconData cart = IconsProxy(0xe001);
  static const IconData orders = IconsProxy(0xe002);
  static const IconData profile = IconsProxy(0xe003);
  static const IconData restaurant = IconsProxy(0xe004);
  static const IconData delivery = IconsProxy(0xe005);
}

class IconsProxy extends IconData {
  const IconsProxy(int codePoint)
      : super(
          codePoint,
          fontFamily: 'TalabatIcons',
          fontPackage: null,
        );
}
