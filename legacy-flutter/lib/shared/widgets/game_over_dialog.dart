import 'package:flutter/material.dart';

import '../theme.dart';

/// Shared end-of-round dialog for both games. Used for "game over" (icon +
/// text always shown together, never a color-only cue) and can double as a
/// "level complete" screen when [isVictory] is true and [onNext] is given.
class GameOverDialog extends StatelessWidget {
  final bool isVictory;
  final int score;
  final int bestScore;
  final bool isNewRecord;
  final VoidCallback onPlayAgain;
  final VoidCallback onMenu;
  final VoidCallback? onNext;

  const GameOverDialog({
    super.key,
    required this.score,
    required this.bestScore,
    required this.onPlayAgain,
    required this.onMenu,
    this.isVictory = false,
    this.isNewRecord = false,
    this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      icon: Icon(
        isVictory ? Icons.emoji_events : Icons.sentiment_dissatisfied,
        size: 40,
        color: isVictory ? OkabeIto.yellow : AppColors.danger,
      ),
      title: Text(isVictory ? 'Nível completo!' : 'Fim de jogo'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Pontuação: $score', style: const TextStyle(fontSize: 18)),
          const SizedBox(height: 4),
          Text('Melhor pontuação: $bestScore', style: const TextStyle(fontSize: 14)),
          if (isNewRecord) ...[
            const SizedBox(height: 8),
            const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.star, color: OkabeIto.yellow),
                SizedBox(width: 4),
                Text('Novo recorde!', style: TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ],
      ),
      actionsAlignment: MainAxisAlignment.center,
      actions: [
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (onNext != null)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: onNext,
                  icon: const Icon(Icons.navigate_next),
                  label: const Text('Próximo nível'),
                ),
              ),
            if (onNext != null) const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onPlayAgain,
                icon: const Icon(Icons.replay),
                label: const Text('Jogar de novo'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onMenu,
                icon: const Icon(Icons.home),
                label: const Text('Menu'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
