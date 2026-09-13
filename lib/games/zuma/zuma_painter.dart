import 'package:flutter/material.dart';

import '../../shared/theme.dart';
import 'zuma_controller.dart';

/// Paints the track, the goal portal, the ball chain, the shooter (a
/// floating crystal at the spiral's center) and any in-flight projectiles.
/// Every ball draws its Okabe-Ito color AND its icon glyph — never color
/// alone. Visual theme: a dark cave with glowing neon-glass surfaces.
class ZumaPainter extends CustomPainter {
  final ZumaController controller;
  final Offset? aimTarget;

  ZumaPainter(this.controller, {this.aimTarget}) : super(repaint: controller);

  @override
  void paint(Canvas canvas, Size size) {
    controller.updateBoardSize(size);

    _drawCaveBackground(canvas, size);
    _drawTrack(canvas, size);
    _drawCornerBrackets(canvas, size);
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

    for (final popup in controller.popups) {
      _drawPopup(canvas, popup);
    }
  }

  static const _glassDark = Color(0xFF1c1430);
  static const _neonCyan = Color(0xFF7ee0f0);
  static const _crystalLight = Color(0xFFc9b6ff);
  static const _crystalDeep = Color(0xFF4d2f9e);
  static const _caveDeep = Color(0xFF08050f);
  static const _caveMid = Color(0xFF221836);

  // Fixed relative positions so the drifting-dust specks don't jitter
  // between frames — only their twinkle phase (driven by the popup/tick
  // clock) would, and we keep it static and cheap here.
  static const _dustSpecks = [
    Offset(0.10, 0.06), Offset(0.85, 0.10), Offset(0.92, 0.42),
    Offset(0.06, 0.46), Offset(0.15, 0.90), Offset(0.88, 0.88),
    Offset(0.55, 0.05), Offset(0.05, 0.70), Offset(0.93, 0.68),
  ];

  void _drawCaveBackground(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = RadialGradient(
          center: Alignment(
            controller.path.center.dx * 2 - 1,
            controller.path.center.dy * 2 - 1,
          ),
          radius: 1.15,
          colors: const [_caveMid, _caveDeep],
        ).createShader(Offset.zero & size),
    );

    final dustPaint = Paint()..color = _crystalLight.withValues(alpha: 0.55);
    for (final speck in _dustSpecks) {
      canvas.drawCircle(Offset(speck.dx * size.width, speck.dy * size.height), 1.4, dustPaint);
    }
  }

  /// A glowing "neon tube" line: a wide blurred stroke underneath a thin
  /// crisp core, the classic faux-bloom trick for canvas-drawn neon.
  void _drawGlowLine(Canvas canvas, Path path, Color color, double coreWidth, {double glowWidth = 0, StrokeCap cap = StrokeCap.round}) {
    final glow = glowWidth > 0 ? glowWidth : coreWidth * 4;
    canvas.drawPath(
      path,
      Paint()
        ..color = color.withValues(alpha: 0.55)
        ..style = PaintingStyle.stroke
        ..strokeWidth = glow
        ..strokeCap = cap
        ..strokeJoin = StrokeJoin.round
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, glow * 0.35),
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = coreWidth
        ..strokeCap = cap
        ..strokeJoin = StrokeJoin.round,
    );
  }

  void _drawTrack(Canvas canvas, Size size) {
    final points = controller.path.pixelPoints(size);
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    final r = controller.ballRadius;

    // Dark glass channel, then a glowing neon edge traced on top.
    canvas.drawPath(
      path,
      Paint()
        ..color = _glassDark
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 2 + 8
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 1.7
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
    _drawGlowLine(canvas, path, _neonCyan, 2.0, glowWidth: 10);
  }

  void _drawCornerBrackets(Canvas canvas, Size size) {
    const inset = 14.0;
    const arm = 26.0;
    final corners = [
      [Offset(inset, inset + arm), Offset(inset, inset), Offset(inset + arm, inset)],
      [Offset(size.width - inset - arm, inset), Offset(size.width - inset, inset), Offset(size.width - inset, inset + arm)],
      [Offset(inset, size.height - inset - arm), Offset(inset, size.height - inset), Offset(inset + arm, size.height - inset)],
      [
        Offset(size.width - inset - arm, size.height - inset),
        Offset(size.width - inset, size.height - inset),
        Offset(size.width - inset, size.height - inset - arm),
      ],
    ];
    for (final corner in corners) {
      final path = Path()
        ..moveTo(corner[0].dx, corner[0].dy)
        ..lineTo(corner[1].dx, corner[1].dy)
        ..lineTo(corner[2].dx, corner[2].dy);
      _drawGlowLine(canvas, path, _neonCyan, 1.6, glowWidth: 7, cap: StrokeCap.round);
    }
  }

  void _drawGoal(Canvas canvas, Size size) {
    final pos = controller.path.pixelAt(controller.path.totalLength, size);
    final r = controller.ballRadius * 1.5;

    canvas.drawCircle(
      pos,
      r,
      Paint()
        ..shader = const RadialGradient(
          colors: [_caveMid, Color(0xFF050308)],
        ).createShader(Rect.fromCircle(center: pos, radius: r)),
    );
    canvas.drawCircle(
      pos,
      r,
      Paint()
        ..color = _crystalLight.withValues(alpha: 0.75)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    canvas.drawCircle(
      pos,
      r - 3,
      Paint()
        ..color = AppColors.danger
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
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

  /// Draws a ball as a glowing gem: a soft color halo behind it, a radial
  /// gradient for the rounded shading, and the icon glyph on top — color
  /// and icon together, never color alone.
  void _drawBall(Canvas canvas, Offset pos, double radius, BallType type) {
    final style = ballStyles[type]!;
    final light = Color.lerp(style.color, Colors.white, 0.55)!;
    final dark = Color.lerp(style.color, Colors.black, 0.35)!;

    canvas.drawCircle(
      pos,
      radius * 1.35,
      Paint()
        ..color = style.color.withValues(alpha: 0.55)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, radius * 0.5),
    );
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
    final path = Path()..moveTo(from.dx, from.dy)..lineTo(to.dx, to.dy);
    canvas.drawPath(
      path,
      Paint()
        ..color = _neonCyan.withValues(alpha: 0.5)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6,
    );
  }

  /// A faceted crystal floating at the spiral's center, standing in for
  /// the shooter — a soft glow shadow underneath sells the levitation.
  void _drawShooter(Canvas canvas, Size size) {
    final pos = controller.shooterPosition;
    final r = controller.ballRadius * 1.9;

    canvas.drawOval(
      Rect.fromCenter(center: pos + Offset(0, r * 0.55), width: r * 1.7, height: r * 0.55),
      Paint()
        ..color = _crystalDeep.withValues(alpha: 0.45)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, r * 0.3),
    );

    final top = pos + Offset(0, -r * 0.75);
    final crystal = Path()
      ..moveTo(top.dx, top.dy)
      ..lineTo(pos.dx + r * 0.65, pos.dy - r * 0.05)
      ..lineTo(pos.dx + r * 0.32, pos.dy + r * 0.75)
      ..lineTo(pos.dx - r * 0.32, pos.dy + r * 0.75)
      ..lineTo(pos.dx - r * 0.65, pos.dy - r * 0.05)
      ..close();

    canvas.drawPath(
      crystal,
      Paint()
        ..color = _crystalDeep.withValues(alpha: 0.7)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, r * 0.35),
    );
    canvas.drawPath(
      crystal,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.2, -0.6),
          colors: const [_crystalLight, _crystalDeep],
        ).createShader(crystal.getBounds()),
    );
    canvas.drawPath(
      crystal,
      Paint()
        ..color = _crystalLight.withValues(alpha: 0.8)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );
    canvas.drawLine(top, pos + Offset(0, r * 0.15), Paint()..color = Colors.white.withValues(alpha: 0.5)..strokeWidth = 1.5);

    _drawBall(canvas, pos + Offset(0, r * 0.08), controller.ballRadius, controller.currentBall);
  }

  void _drawPopup(Canvas canvas, ScorePopup popup) {
    final t = (popup.age / _popupLifetimeForPaint).clamp(0.0, 1.0);
    final pos = popup.position + Offset(0, -t * 46);
    final opacity = 1.0 - t;
    final tp = TextPainter(
      text: TextSpan(
        text: '+${popup.amount}',
        style: TextStyle(
          color: _neonCyan.withValues(alpha: opacity),
          fontSize: 18,
          fontWeight: FontWeight.bold,
          shadows: [Shadow(color: Colors.black.withValues(alpha: opacity), blurRadius: 3)],
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, pos - Offset(tp.width / 2, tp.height / 2));
  }

  static const _popupLifetimeForPaint = 0.9;

  @override
  bool shouldRepaint(covariant ZumaPainter oldDelegate) => true;
}
