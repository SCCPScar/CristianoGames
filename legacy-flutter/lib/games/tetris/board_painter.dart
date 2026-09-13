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

  /// Draws a chunky, beveled "candy block" like classic Tetris skins: a
  /// mid-tone face with a lighter highlight on the top-left edges and a
  /// darker shadow on the bottom-right edges, all clipped to a rounded
  /// square so blocks still read as one connected piece.
  void _drawBlock(Canvas canvas, Rect rect, TetrominoType type, {required bool filled}) {
    final style = tetrominoStyles[type]!;
    final inset = rect.deflate(1.0);
    final rrect = RRect.fromRectAndRadius(inset, const Radius.circular(4));
    final bevel = inset.shortestSide * 0.16;

    canvas.save();
    canvas.clipRRect(rrect);

    canvas.drawRect(inset, Paint()..color = style.color);

    final light = Color.lerp(style.color, Colors.white, 0.45)!;
    final dark = Color.lerp(style.color, Colors.black, 0.45)!;

    final topHighlight = Path()
      ..moveTo(inset.left, inset.top)
      ..lineTo(inset.right, inset.top)
      ..lineTo(inset.right - bevel, inset.top + bevel)
      ..lineTo(inset.left + bevel, inset.top + bevel)
      ..close();
    final leftHighlight = Path()
      ..moveTo(inset.left, inset.top)
      ..lineTo(inset.left + bevel, inset.top + bevel)
      ..lineTo(inset.left + bevel, inset.bottom - bevel)
      ..lineTo(inset.left, inset.bottom)
      ..close();
    final bottomShadow = Path()
      ..moveTo(inset.left, inset.bottom)
      ..lineTo(inset.left + bevel, inset.bottom - bevel)
      ..lineTo(inset.right - bevel, inset.bottom - bevel)
      ..lineTo(inset.right, inset.bottom)
      ..close();
    final rightShadow = Path()
      ..moveTo(inset.right, inset.top)
      ..lineTo(inset.right - bevel, inset.top + bevel)
      ..lineTo(inset.right - bevel, inset.bottom - bevel)
      ..lineTo(inset.right, inset.bottom)
      ..close();

    canvas.drawPath(topHighlight, Paint()..color = light.withValues(alpha: 0.8));
    canvas.drawPath(leftHighlight, Paint()..color = light.withValues(alpha: 0.55));
    canvas.drawPath(bottomShadow, Paint()..color = dark.withValues(alpha: 0.55));
    canvas.drawPath(rightShadow, Paint()..color = dark.withValues(alpha: 0.7));

    canvas.drawRect(
      inset.deflate(bevel),
      Paint()..color = style.color,
    );

    canvas.restore();

    final fg = legibleForegroundOn(style.color);
    final textPainter = TextPainter(
      text: TextSpan(
        text: style.letter,
        style: TextStyle(
          color: fg,
          fontSize: rect.height * 0.48,
          fontWeight: FontWeight.bold,
          shadows: [
            Shadow(
              color: fg == Colors.white ? Colors.black54 : Colors.white54,
              blurRadius: 2,
              offset: const Offset(0, 1),
            ),
          ],
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
