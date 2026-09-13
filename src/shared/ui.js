import { hexToNum, AppColors } from './theme.js';

/// A rounded-rect button with a label. Implemented as a REAL HTML
/// <button> positioned on top of the canvas, not a Phaser GameObject —
/// Phaser's canvas-based pointer hit-testing proved unreliable for
/// buttons inside modal dialogs in this app (clicks on freshly-created
/// buttons were silently dropped in a way that never fully made sense
/// even after extensive investigation; a couple of pixels of button
/// position or unrelated scene objects changed the outcome). A real DOM
/// button gets the browser's own, thoroughly-tested click handling
/// instead, which sidesteps the whole problem.
///
/// [x, y] are ABSOLUTE scene (game-space) coordinates — this positions
/// the DOM element to match using the canvas's current on-screen size,
/// and re-syncs on window resize.
export function makeButton(scene, { x, y, width = 240, height = 56, label, bgColor = AppColors.accent, textColor, fontSize = 18, radius = 14, onClick, filled = true }) {
  const canvas = scene.game.canvas;
  const resolvedTextColor = textColor || (filled ? legibleTextColor(bgColor) : bgColor);

  const btn = document.createElement('button');
  btn.textContent = label;
  btn.type = 'button';
  Object.assign(btn.style, {
    position: 'fixed',
    boxSizing: 'border-box',
    border: filled ? 'none' : `2px solid ${bgColor}`,
    borderRadius: `${radius}px`,
    background: filled ? bgColor : 'transparent',
    color: resolvedTextColor,
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 'bold',
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
    padding: '0',
    zIndex: '10',
    transition: 'transform 0.05s ease-out',
  });
  document.body.appendChild(btn);

  function reposition() {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / scene.scale.width;
    const scaleY = rect.height / scene.scale.height;
    const scale = Math.min(scaleX, scaleY);
    const w = width * scaleX;
    const h = height * scaleY;
    btn.style.left = `${rect.left + x * scaleX - w / 2}px`;
    btn.style.top = `${rect.top + y * scaleY - h / 2}px`;
    btn.style.width = `${w}px`;
    btn.style.height = `${h}px`;
    btn.style.fontSize = `${fontSize * scale}px`;
  }
  reposition();
  window.addEventListener('resize', reposition);

  const press = () => { btn.style.transform = 'scale(0.96)'; };
  const release = () => { btn.style.transform = 'scale(1)'; };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointerleave', release);
  btn.addEventListener('click', () => { if (onClick) onClick(); });

  return {
    destroy() {
      window.removeEventListener('resize', reposition);
      btn.remove();
    },
    disableInteractive() {
      btn.disabled = true;
    },
    setInteractive() {
      btn.disabled = false;
    },
  };
}

function legibleTextColor(bgHex) {
  // Simple luminance check reused from theme.js's rule of thumb: light
  // accents (yellow) get dark text, everything else gets white.
  const n = hexToNum(bgHex);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.6 ? '#121212' : '#ffffff';
}

/// A full-screen dim overlay plus a centered panel. Returns { panel,
/// close, centerX, centerY, trackExtra }. Add content (text, graphics —
/// or anything else purely visual) to [panel], a Container centered on
/// screen. For buttons made with makeButton(), position them at
/// (centerX + localX, centerY + localY) and pass them to trackExtra() so
/// close() destroys the underlying DOM element too — makeButton doesn't
/// nest inside [panel] since it isn't a Phaser GameObject.
///
/// Pass [blockers]: the scene's own Phaser-interactive objects (board
/// input zones, cards, control buttons) that sit underneath and must not
/// react while the modal is open. They're disabled while open and
/// re-enabled by close().
export function showModal(scene, { panelWidth = 300, panelHeight = 260, blockers = [] } = {}) {
  const { width, height } = scene.scale;
  const depthBase = 1000;
  const centerX = width / 2;
  const centerY = height / 2;

  for (const obj of blockers) obj.disableInteractive();

  const overlay = scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.6).setDepth(depthBase);

  const panel = scene.add.container(centerX, centerY).setDepth(depthBase + 1);
  const bg = scene.add.graphics();
  bg.fillStyle(hexToNum(AppColors.surface), 1);
  bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 18);
  panel.add(bg);

  const extras = [];
  function trackExtra(obj) {
    extras.push(obj);
    return obj;
  }

  function close() {
    overlay.destroy();
    panel.destroy();
    extras.forEach((o) => o.destroy());
    for (const obj of blockers) obj.setInteractive();
  }

  return { panel, overlay, close, panelWidth, panelHeight, centerX, centerY, trackExtra };
}
