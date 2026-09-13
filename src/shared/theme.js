// Okabe-Ito colorblind-safe palette, validated for protanopia,
// deuteranopia and tritanopia. Pure saturated red (#FF0000) and pure
// saturated green (#00FF00) must never be used to carry meaning anywhere
// in the app — only these eight colors are allowed for that purpose.
export const OkabeIto = {
  black: '#000000',
  orange: '#E69F00',
  skyBlue: '#56B4E9',
  bluishGreen: '#009E73',
  yellow: '#F0E442',
  blue: '#0072B2',
  vermillion: '#D55E00',
  reddishPurple: '#CC79A7',
};

// App-wide surface/text colors, chosen to keep WCAG AA contrast (>= 4.5:1
// for normal text) between foreground and background.
export const AppColors = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceHigh: '#2a2a2a',
  textPrimary: '#f5f5f5',
  textSecondary: '#bdbdbd',
  accent: OkabeIto.skyBlue,
  danger: OkabeIto.vermillion,
  success: OkabeIto.bluishGreen,
};

/// Converts a "#RRGGBB" string to the numeric form Phaser's Graphics /
/// fillStyle APIs expect.
export function hexToNum(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

/// Linearly interpolates between two 0xRRGGBB numbers.
export function lerpColorNum(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// The seven standard tetrominoes. Each maps to one Okabe-Ito color PLUS
// its letter, drawn inside every block — the accessibility redundancy so
// no piece is ever identified by color alone.
export const tetrominoStyles = {
  I: { color: OkabeIto.skyBlue, letter: 'I' },
  O: { color: OkabeIto.yellow, letter: 'O' },
  T: { color: OkabeIto.reddishPurple, letter: 'T' },
  S: { color: OkabeIto.bluishGreen, letter: 'S' },
  Z: { color: OkabeIto.vermillion, letter: 'Z' },
  J: { color: OkabeIto.blue, letter: 'J' },
  L: { color: OkabeIto.orange, letter: 'L' },
};

// The five Zuma-style ball types. Each maps to one Okabe-Ito color PLUS a
// distinct icon shape — same rule, never color alone.
export const ballStyles = {
  amber: { color: OkabeIto.orange, icon: 'dot' },
  sky: { color: OkabeIto.skyBlue, icon: 'triangle' },
  green: { color: OkabeIto.bluishGreen, icon: 'star' },
  purple: { color: OkabeIto.reddishPurple, icon: 'diamond' },
  vermillion: { color: OkabeIto.vermillion, icon: 'square' },
};

export const BALL_TYPES = Object.keys(ballStyles);
export const TETROMINO_TYPES = Object.keys(tetrominoStyles);

/// Picks a legible foreground (black or white) for text/icons drawn on
/// top of [hex], based on relative luminance (same formula and 0.5
/// threshold as the original Flutter app) — keeps every glyph readable
/// regardless of which palette color it sits on.
export function legibleForegroundOn(hex) {
  const c = hexToNum(hex);
  const r = ((c >> 16) & 255) / 255;
  const g = ((c >> 8) & 255) / 255;
  const b = (c & 255) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
