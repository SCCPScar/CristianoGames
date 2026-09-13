import 'package:flutter/material.dart';

/// Shared pause dialog for both games: Pausar / Continuar / Sair.
/// Shown modally on top of the paused game.
class PauseDialog extends StatelessWidget {
  final VoidCallback onResume;
  final VoidCallback onExit;

  const PauseDialog({super.key, required this.onResume, required this.onExit});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      icon: const Icon(Icons.pause_circle_filled, size: 40),
      title: const Text('Pausado'),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onResume,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Continuar'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onExit,
                icon: const Icon(Icons.exit_to_app),
                label: const Text('Sair'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
