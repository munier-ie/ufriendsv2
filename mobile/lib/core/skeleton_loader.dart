import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'app_theme.dart';

class Skeleton extends StatelessWidget {
  final double? width;
  final double? height;
  final BoxShape shape;
  final BorderRadiusGeometry? borderRadius;

  const Skeleton({
    super.key,
    this.width,
    this.height,
    this.shape = BoxShape.rectangle,
    this.borderRadius,
  });

  const Skeleton.circular({
    super.key,
    required double size,
  })  : width = size,
        height = size,
        shape = BoxShape.circle,
        borderRadius = null;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: context.isDark
          ? Colors.grey[800]!.withValues(alpha: 0.5)
          : Colors.grey[200]!.withValues(alpha: 0.5),
      highlightColor: context.isDark
          ? Colors.grey[700]!.withValues(alpha: 0.5)
          : Colors.grey[50]!.withValues(alpha: 0.5),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: context.cardColor,
          shape: shape,
          borderRadius: shape == BoxShape.rectangle 
              ? (borderRadius ?? BorderRadius.circular(8)) 
              : null,
        ),
      ),
    );
  }
}

class SkeletonListTile extends StatelessWidget {
  const SkeletonListTile({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Row(
        children: [
          const Skeleton.circular(size: 40),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Skeleton(
                  width: MediaQuery.of(context).size.width * 0.6,
                  height: 16,
                ),
                const SizedBox(height: 8),
                Skeleton(
                  width: MediaQuery.of(context).size.width * 0.4,
                  height: 12,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SkeletonCard extends StatelessWidget {
  final double height;
  const SkeletonCard({super.key, this.height = 150});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Skeleton(width: 100, height: 20),
          const SizedBox(height: 16),
          Skeleton(width: double.infinity, height: height - 60),
        ],
      ),
    );
  }
}
