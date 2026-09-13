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

  static const _stoneBase = Color(0xFF433d33);
  static const _stoneGroove = Color(0xFF221f19);
  static const _stoneRim = Color(0xFF6b6152);

  void _drawTrack(Canvas canvas, Size size) {
    final points = controller.path.pixelPoints(size);
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    final r = controller.ballRadius;

    // Carved-stone channel: a raised rim, then a sunken groove on top so
    // the track reads as cut into stone rather than a flat gray stripe.
    canvas.drawPath(
      path,
      Paint()
        ..color = _stoneRim
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 2 + 10
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = _stoneBase
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 2 + 4
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = _stoneGroove
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 1.7
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  void _drawGoal(Canvas canvas, Size size) {
    final pos = controller.path.pixelAt(controller.path.totalLength, size);
    final r = controller.ballRadius * 1.5;

    canvas.drawCircle(pos, r + 5, Paint()..color = _stoneRim);
    canvas.drawCircle(
      pos,
      r,
      Paint()
        ..shader = RadialGradient(
          colors: const [Color(0xFF2a2a2a), Colors.black],
        ).createShader(Rect.fromCircle(center: pos, radius: r)),
    );
    canvas.drawCircle(
      pos,
      r - 1.5,
      Paint()
        ..color = AppColors.danger
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
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

  /// Draws a ball as a glossy marble: a radial gradient for the rounded
  /// shading, a small specular highlight, a dark rim, and the icon glyph
  /// on top — color and icon together, never color alone.
  void _drawBall(Canvas canvas, Offset pos, double radius, BallType type) {
    final style = ballStyles[type]!;
    final light = Color.lerp(style.color, Colors.white, 0.55)!;
    final dark = Color.lerp(style.color, Colors.black, 0.35)!;

    canvas.drawCircle(
      pos,
      radius,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.35, -0.4),
          radius: 1.1,
          colors: [light, style.color, dark],
          stops: const [0.0, 0.55, 1.0],
        ).createShader(Rect.fromCircle(center: pos, radius: radius)),
    );
    canvas.drawCircle(
      pos,
      radius,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );
    canvas.drawCircle(
      pos + Offset(-radius * 0.35, -radius * 0.4),
      radius * 0.28,
      Paint()..color = Colors.white.withValues(alpha: 0.55),
    );

    final fg = legibleForegroundOn(style.color);
    final tp = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(style.icon.codePoint),
        style: TextStyle(
          fontSize: radius,
          fontFamily: style.icon.fontFamily,
          color: fg,
          shadows: [
            Shadow(
              color: fg == Colors.white ? Colors.black45 : Colors.white38,
              blurRadius: 2,
            ),
          ],
        ),
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
    final pedestalR = controller.ballRadius * 1.7;
    canvas.drawCircle(pos, pedestalR + 4, Paint()..color = _stoneRim);
    canvas.drawCircle(
      pos,
      pedestalR,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.3, -0.3),
          colors: const [Color(0xFF57503f), _stoneBase],
        ).createShader(Rect.fromCircle(center: pos, radius: pedestalR)),
    );
    _drawBall(canvas, pos, controller.ballRadius, controller.currentBall);

    final nextPos = pos + Offset(0, controller.ballRadius * 2.4);
    _drawBall(canvas, nextPos, controller.ballRadius * 0.6, controller.nextBall);
  }

  @override
  bool shouldRepaint(covariant ZumaPainter oldDelegate) => true;
}
