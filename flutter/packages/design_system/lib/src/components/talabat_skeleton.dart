import 'package:flutter/material.dart';

class TalabatSkeleton extends StatefulWidget {
  const TalabatSkeleton.rounded({super.key, this.height = 16, this.width = double.infinity})
      : shape = BoxShape.rectangle,
        radius = 999;

  const TalabatSkeleton.rect({super.key, this.height = 16, this.width = double.infinity, this.radius = 16})
      : shape = BoxShape.rectangle;

  final double height;
  final double width;
  final double radius;
  final BoxShape shape;

  @override
  State<TalabatSkeleton> createState() => _TalabatSkeletonState();
}

class _TalabatSkeletonState extends State<TalabatSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.surfaceVariant;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: color.withOpacity(0.6 + 0.3 * _controller.value),
            borderRadius: widget.shape == BoxShape.rectangle ? BorderRadius.circular(widget.radius) : null,
            shape: widget.shape,
          ),
        );
      },
    );
  }
}
