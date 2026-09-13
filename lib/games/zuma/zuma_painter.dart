import 'package:flutter/material.dart';

import '../../shared/theme.dart';
import 'zuma_controller.dart';

/// Paints the track, the goal hole, the ball chain, the shooter (current +
/// next ball) and any in-flight projectiles. Every ball draws its
/// Okabe-Ito color AND its icon glyph — never color alone.
class ZumaPainter extends CustomPainter {
  final ZumaController controller;
  final Offset? aimTarget;

  ZumaPainter(this.controller, {this.aimTarget}) : super(repaint: controller);

  @override
  void paint(Canvas canvas, Size size) {
    controller.updateBoardSize(size);

    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.background);

    _drawTrack(canvas, size);
    _drawGoal(canvas, size);

    for (final ball in controller.chain) {
      final pos = controller.path.pixelAt(ball.distance, size);
      _drawBall(canvas, pos, controller.ballRadius, ball.type);
    }

    for (final p in controller.projectiles) {
      _drawBall(canvas, p.position, controller.ballRadius, p.type);
    }

    if (aimTarget != null && !controller.isPaused && !controller.isGameOver) {
      _drawAimLine(canvas, controller.shooterPosition, aimTarget!);
    }

    _drawShooter(canvas, size);
  }

  void _drawTrack(Canvas canvas, Size size) {
    final points = controller.path.pixelPoints(size);
    final paint = Paint()
      ..color = AppColors.surfaceHigh
      ..style = PaintingStyle.stroke
      ..strokeWidth = controller.ballRadius * 2 + 6
      ..strokeCap = StrokeCap.round;
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(path, paint);
  }

  void _drawGoal(Canvas canvas, Size size) {
    final pos = controller.path.pixelAt(controller.path.totalLength, size);
    final r = controller.ballRadius * 1.4;
    canvas.drawCircle(pos, r, Paint()..color = Colors.black);
    canvas.drawCircle(pos, r, Paint()
      ..color = AppColors.danger
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3);
    final icon = Icons.warning_amber_rounded;
    final tp = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(icon.codePoint),
        style: TextStyle(fontSize: r, fontFamily: icon.fontFamily, color: AppColors.danger),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, pos - Offset(tp.width / 2, tp.height / 2));
  }

  void _drawBall(Canvas canvas, Offset pos, double radius, BallType type) {
    final style = ballStyles[type]!;
    canvas.drawCircle(pos, radius, Paint()..color = style.color);
    canvas.drawCircle(
      pos,
      radius,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.25)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );
    final fg = legibleForegroundOn(style.color);
    final tp = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(style.icon.codePoint),
        style: TextStyle(fontSize: radius, fontFamily: style.icon.fontFamily, color: fg),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, pos - Offset(tp.width / 2, tp.height / 2));
  }

  void _drawAimLine(Canvas canvas, Offset from, Offset to) {
    final paint = Paint()
      ..color = AppColors.textPrimary.withValues(alpha: 0.6)
      ..strokeWidth = 2;
    const dashLength = 8.0;
    final total = (to - from).distance;
    final direction = (to - from) / (total == 0 ? 1 : total);
    var covered = 0.0;
    var draw = true;
    var current = from;
    while (covered < total) {
      final step = dashLength.clamp(0.0, total - covered).toDouble();
      final next = current + direction * step;
      if (draw) canvas.drawLine(current, next, paint);
      current = next;
      covered += step;
      draw = !draw;
    }
  }

  void _drawShooter(Canvas canvas, Size size) {
    final pos = controller.shooterPosition;
    canvas.drawCircle(pos, controller.ballRadius * 1.6, Paint()..color = AppColors.surfaceHigh);
    _drawBall(canvas, pos, controller.ballRadius, controller.currentBall);

    final nextPos = pos + Offset(0, controller.ballRadius * 2.4);
    _drawBall(canvas, nextPos, controller.ballRadius * 0.6, controller.nextBall);
  }

  @override
  bool shouldRepaint(covariant ZumaPainter oldDelegate) => true;
}
