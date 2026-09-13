// The curved track balls travel along, stored as normalized (0..1, 0..1)
// points so it scales to any screen size. A spiral winding inward to a
// center goal, like the original Zuma's stone temple track — balls enter
// from the outer ring and spiral in toward the goal next to the shooter's
// pedestal.
export class GamePath {
  constructor() {
    this.center = { x: 0.5, y: 0.46 };
    const turns = 2.0;
    const rxOuter = 0.42, rxInner = 0.10;
    const ryOuter = 0.31, ryInner = 0.07;
    const startAngle = -Math.PI / 2;
    const samples = 480;

    const points = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const angle = startAngle + t * turns * 2 * Math.PI;
      const rx = rxOuter + (rxInner - rxOuter) * t;
      const ry = ryOuter + (ryInner - ryOuter) * t;
      points.push({ x: this.center.x + rx * Math.cos(angle), y: this.center.y + ry * Math.sin(angle) });
    }

    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
    }

    this._points = points;
    this._cumulative = cumulative;
    this.totalLength = cumulative[cumulative.length - 1];
  }

  /// Normalized (0..1, 0..1) position at [distance] along the path.
  /// Clamped to the path's ends.
  normalizedAt(distance) {
    const d = Math.max(0, Math.min(distance, this.totalLength));
    if (d <= 0) return this._points[0];
    if (d >= this.totalLength) return this._points[this._points.length - 1];

    let lo = 0, hi = this._cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this._cumulative[mid] < d) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(1, Math.min(lo, this._cumulative.length - 1));
    const segStart = this._cumulative[i - 1];
    const segEnd = this._cumulative[i];
    const segT = segEnd > segStart ? (d - segStart) / (segEnd - segStart) : 0;
    const a = this._points[i - 1], b = this._points[i];
    return { x: a.x + (b.x - a.x) * segT, y: a.y + (b.y - a.y) * segT };
  }

  pixelAt(distance, width, height) {
    const n = this.normalizedAt(distance);
    return { x: n.x * width, y: n.y * height };
  }

  pixelPoints(width, height) {
    return this._points.map((p) => ({ x: p.x * width, y: p.y * height }));
  }
}
