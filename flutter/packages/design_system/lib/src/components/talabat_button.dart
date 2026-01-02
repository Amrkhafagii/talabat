import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class TalabatButton extends StatelessWidget {
  const TalabatButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = TalabatButtonVariant.primary,
  });

  final String label;
  final VoidCallback? onPressed;
  final TalabatButtonVariant variant;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final palette = variant == TalabatButtonVariant.primary
        ? (onPressed == null ? colors.primary.withOpacity(0.5) : colors.primary)
        : Colors.transparent;
    final fg = variant == TalabatButtonVariant.primary
        ? colors.onPrimary
        : Theme.of(context).colorScheme.primary;

    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: TalabatColors.spacing.lg * 2),
      child: ElevatedButton(
        onPressed: onPressed,
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.all(palette),
          foregroundColor: WidgetStateProperty.all(fg),
          elevation: WidgetStateProperty.all(0),
          side: variant == TalabatButtonVariant.secondary
              ? WidgetStateProperty.all(
                  BorderSide(color: Theme.of(context).dividerColor),
                )
              : null,
        ),
        child: Text(label, style: TalabatColors.typography.button.copyWith(color: fg)),
      ),
    );
  }
}

enum TalabatButtonVariant { primary, secondary }
