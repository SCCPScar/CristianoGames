import { hexToNum } from './theme.js';

function star5Points(cx, cy, outerR, innerR) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return points;
}

/// Draws one of the Zuma ball glyphs (dot/triangle/star/diamond/square)
/// centered at (cx, cy). Vector shapes, not an icon font — crisp at any
/// size and no font-loading dependency.
export function drawIcon(g, name, cx, cy, size, colorHex) {
  const color = hexToNum(colorHex);
  const r = size / 2;
  g.fillStyle(color, 1);

  switch (name) {
    case 'dot':
      g.lineStyle(Math.max(1.5, size * 0.14), color, 1);
      g.strokeCircle(cx, cy, r * 0.78);
      g.fillCircle(cx, cy, r * 0.3);
      break;
    case 'triangle':
      g.fillPoints(
        [
          { x: cx, y: cy - r },
          { x: cx + r * 0.92, y: cy + r * 0.75 },
          { x: cx - r * 0.92, y: cy + r * 0.75 },
        ],
        true,
      );
      break;
    case 'star':
      g.fillPoints(star5Points(cx, cy, r, r * 0.42), true);
      break;
    case 'diamond':
      g.fillPoints(
        [
          { x: cx, y: cy - r },
          { x: cx + r, y: cy },
          { x: cx, y: cy + r },
          { x: cx - r, y: cy },
        ],
        true,
      );
      break;
    case 'square':
      g.fillRoundedRect(cx - r * 0.75, cy - r * 0.75, r * 1.5, r * 1.5, r * 0.2);
      break;
    default:
      g.fillCircle(cx, cy, r * 0.5);
  }
}
