import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class TalabatCard extends StatelessWidget {
  const TalabatCard({super.key, required this.child, this.padding});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(TalabatColors.radii.card),
        border: Border.all(color: Theme.of(context).dividerColor.withOpacity(0.5)),
      ),
      padding: padding ?? EdgeInsets.all(TalabatColors.spacing.lg),
      child: child,
    );
  }
}
