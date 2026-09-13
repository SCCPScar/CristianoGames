import 'package:flutter/material.dart';

import '../../shared/theme.dart';
import 'tetris_controller.dart';

/// Paints the board grid, locked blocks, the ghost outline and the falling
/// piece. Every filled cell draws both its Okabe-Ito color AND its letter
/// — the accessibility redundancy required everywhere in this app.
class TetrisBoardPainter extends CustomPainter {
  final TetrisController controller;

  TetrisBoardPainter(this.controller) : super(repaint: controller);

  @override
  void paint(Canvas canvas, Size size) {
    final cellSize = size.width / boardCols;

    final gridPaint = Paint()
      ..color = AppColors.surfaceHigh
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.background);

    for (var r = 0; r < boardRows; r++) {
      for (var c = 0; c < boardCols; c++) {
        final rect = Rect.fromLTWH(c * cellSize, r * cellSize, cellSize, cellSize);
        canvas.drawRect(rect, gridPaint);
        final type = controller.board[r][c];
        if (type != null) {
          _drawBlock(canvas, rect, type, filled: true);
        }
      }
    }

    // Ghost piece: faint outline only, never the only cue for landing spot
    // (the falling piece itself, drawn below, provides the primary cue).
    for (final cell in controller.ghostPiece.boardCells) {
      if (cell.x < 0) continue;
      final rect = Rect.fromLTWH(cell.y * cellSize, cell.x * cellSize, cellSize, cellSize);
      _drawGhost(canvas, rect, controller.current.type);
    }

    for (final cell in controller.current.boardCells) {
      if (cell.x < 0) continue;
      final rect = Rect.fromLTWH(cell.y * cellSize, cell.x * cellSize, cellSize, cellSize);
      _drawBlock(canvas, rect, controller.current.type, filled: true);
    }
  }

  void _drawBlock(Canvas canvas, Rect rect, TetrominoType type, {required bool filled}) {
    final style = tetrominoStyles[type]!;
    final inset = rect.deflate(1.5);
    final paint = Paint()..color = style.color;
    canvas.drawRRect(RRect.fromRectAndRadius(inset, const Radius.circular(3)), paint);

    final textPainter = TextPainter(
      text: TextSpan(
        text: style.letter,
        style: TextStyle(
          color: legibleForegroundOn(style.color),
          fontSize: rect.height * 0.5,
          fontWeight: FontWeight.bold,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    textPainter.paint(
      canvas,
      rect.center - Offset(textPainter.width / 2, textPainter.height / 2),
    );
  }

  void _drawGhost(Canvas canvas, Rect rect, TetrominoType type) {
    final style = tetrominoStyles[type]!;
    final inset = rect.deflate(1.5);
    final paint = Paint()
      ..color = style.color.withValues(alpha: 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawRRect(RRect.fromRectAndRadius(inset, const Radius.circular(3)), paint);
  }

  @override
  bool shouldRepaint(covariant TetrisBoardPainter oldDelegate) => true;
}
