import 'package:flutter/material.dart';

/// A large touch-target control button (>= 48x48 dp) used for the on-screen
/// game controls, always paired with an icon so it reads at a glance.
class BigControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final VoidCallback? onLongPress;

  const BigControlButton({
    super.key,
    required this.icon,
    required this.label,
    this.onPressed,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: Material(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onPressed,
          onLongPress: onLongPress,
          child: Container(
            width: 64,
            height: 64,
            alignment: Alignment.center,
            child: Icon(icon, size: 32),
          ),
        ),
      ),
    );
  }
}
