// The curved track balls travel along, stored as normalized (0..1, 0..1)
// points so it scales to any screen size. A spiral winding inward to a
// center goal, like the original Zuma's stone temple track — balls enter
// from the outer ring and spiral in toward the goal next to the shooter's
// pedestal.
export class GamePath {
  constructor() {
    this.center = { x: 0.5, y: 0.46 };
    // 2.5 packed the loops in too tight (rxInner/ryInner stayed the same,
    // so the same radial range now has to fit more windings); back off to
    // give each loop visible breathing room from its neighbors.
    const turns = 2.0;
    const rxOuter = 0.45, rxInner = 0.10;
    // Kept a bit shy of the board's actual top/bottom edge (rather than
    // 0.31) so a ball rendered at its full display radius, plus the top
    // and bottom border art (now a fair bit taller now that it's a real,
    // undistorted crop instead of a squashed placeholder), never gets
    // clipped by the board bounds — landscape boards are short enough
    // vertically that this margin matters.
    const ryOuter = 0.23, ryInner = 0.07;
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
    this._points = points;

    // Arc length starts out measured in normalized (aspect-ratio-agnostic)
    // units as a safe default. setPixelSize() below rebuilds this table in
    // true pixel units once the board's real width/height are known —
    // ball spacing needs to be measured in real pixels, not this default,
    // or a wide-short (landscape) board stretches the x-axis so much more
    // than the y-axis that equal steps of "distance" land visually much
    // closer together on the path's more vertical stretches than on its
    // horizontal ones, making the chain look uneven/overlapping.
    this._buildCumulative(1, 1);
  }

  _buildCumulative(width, height) {
    const points = this._points;
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const dx = (points[i].x - points[i - 1].x) * width;
      const dy = (points[i].y - points[i - 1].y) * height;
      cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
    }
    this._cumulative = cumulative;
    this.totalLength = cumulative[cumulative.length - 1];
    this._pixelWidth = width;
    this._pixelHeight = height;
  }

  /// Rebuilds the arc-length table for the board's actual pixel
  /// dimensions, so a fixed "distance" gap between chain balls maps to a
  /// consistent real pixel gap everywhere along the path. A no-op if the
  /// size hasn't changed.
  setPixelSize(width, height) {
    if (this._pixelWidth === width && this._pixelHeight === height) return;
    this._buildCumulative(width, height);
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
