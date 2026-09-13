import 'dart:ui';

/// The curved track balls travel along, stored as normalized (0..1, 0..1)
/// points so it scales to any screen size. A simple zigzag/S-shape, as
/// suggested for an MVP — from the bottom-left "spawn" end up to a goal
/// hole near the top-center.
class GamePath {
  final List<Offset> _points;
  final List<double> _cumulative;
  final double totalLength;

  GamePath._(this._points, this._cumulative, this.totalLength);

  factory GamePath.classic() {
    const waypoints = [
      Offset(0.15, 0.90),
      Offset(0.85, 0.90),
      Offset(0.85, 0.68),
      Offset(0.15, 0.68),
      Offset(0.15, 0.46),
      Offset(0.85, 0.46),
      Offset(0.85, 0.24),
      Offset(0.50, 0.10),
    ];

    const stepsPerSegment = 24;
    final points = <Offset>[];
    for (var i = 0; i < waypoints.length - 1; i++) {
      final a = waypoints[i];
      final b = waypoints[i + 1];
      final steps = i == waypoints.length - 2 ? stepsPerSegment + 1 : stepsPerSegment;
      for (var s = 0; s < steps; s++) {
        final t = s / stepsPerSegment;
        points.add(Offset.lerp(a, b, t)!);
      }
    }

    final cumulative = <double>[0];
    for (var i = 1; i < points.length; i++) {
      cumulative.add(cumulative[i - 1] + (points[i] - points[i - 1]).distance);
    }

    return GamePath._(points, cumulative, cumulative.last);
  }

  /// Normalized (0..1, 0..1) position at [distance] along the path.
  /// Clamped to the path's ends.
  Offset normalizedAt(double distance) {
    final d = distance.clamp(0.0, totalLength);
    if (d <= 0) return _points.first;
    if (d >= totalLength) return _points.last;

    // Linear scan is fine: paths have a few hundred points and this is
    // called for a few dozen balls per frame at most.
    var lo = 0;
    var hi = _cumulative.length - 1;
    while (lo < hi) {
      final mid = (lo + hi) ~/ 2;
      if (_cumulative[mid] < d) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    final i = lo.clamp(1, _cumulative.length - 1);
    final segStart = _cumulative[i - 1];
    final segEnd = _cumulative[i];
    final segT = segEnd > segStart ? (d - segStart) / (segEnd - segStart) : 0.0;
    return Offset.lerp(_points[i - 1], _points[i], segT)!;
  }

  Offset pixelAt(double distance, Size size) {
    final n = normalizedAt(distance);
    return Offset(n.dx * size.width, n.dy * size.height);
  }

  List<Offset> pixelPoints(Size size) => _points.map((p) => Offset(p.dx * size.width, p.dy * size.height)).toList();
}
