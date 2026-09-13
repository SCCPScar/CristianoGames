import 'package:flutter/material.dart';

import 'theme.dart';

/// Developer-only sanity check screen: shows every tetromino and ball type
/// side by side so the color+icon pairing can be visually verified (and
/// checked against grayscale) before either game is built. Reachable via a
/// long-press on the home screen title — not part of the normal flow for
/// the end user.
class PaletteDemoScreen extends StatelessWidget {
  const PaletteDemoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verificação de acessibilidade')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Peças do Tetris',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              for (final entry in tetrominoStyles.entries)
                _Swatch(
                  color: entry.value.color,
                  label: entry.value.letter,
                  name: entry.key.name.toUpperCase(),
                ),
            ],
          ),
          const SizedBox(height: 32),
          const Text(
            'Bolas do Zuma',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              for (final entry in ballStyles.entries)
                _Swatch(
                  color: entry.value.color,
                  icon: entry.value.icon,
                  name: entry.key.name,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Swatch extends StatelessWidget {
  final Color color;
  final String? label;
  final IconData? icon;
  final String name;

  const _Swatch({required this.color, required this.name, this.label, this.icon});

  @override
  Widget build(BuildContext context) {
    final fg = legibleForegroundOn(color);
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
          alignment: Alignment.center,
          child: label != null
              ? Text(label!, style: TextStyle(color: fg, fontSize: 24, fontWeight: FontWeight.bold))
              : Icon(icon, color: fg, size: 32),
        ),
        const SizedBox(height: 4),
        Text(name, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
