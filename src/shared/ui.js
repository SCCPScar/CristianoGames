import Phaser from 'phaser';
import { hexToNum, AppColors } from './theme.js';

/// A rounded-rect button with a label, built from primitives so it works
/// the same way in every scene (home, pause dialog, game-over dialog).
export function makeButton(scene, { x, y, width = 240, height = 56, label, bgColor = AppColors.accent, textColor, fontSize = 18, radius = 14, onClick, filled = true }) {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  if (filled) {
    g.fillStyle(hexToNum(bgColor), 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  } else {
    g.lineStyle(2, hexToNum(bgColor), 1);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  }
  const resolvedTextColor = textColor || (filled ? legibleTextColor(bgColor) : bgColor);
  const text = scene.add
    .text(0, 0, label, { fontFamily: 'system-ui, sans-serif', fontSize: `${fontSize}px`, fontStyle: 'bold', color: resolvedTextColor })
    .setOrigin(0.5);
  container.add([g, text]);
  container.setSize(width, height);
  container.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });
  container.on('pointerdown', () => container.setScale(0.96));
  container.on('pointerup', () => {
    container.setScale(1);
    if (onClick) onClick();
  });
  container.on('pointerout', () => container.setScale(1));
  return container;
}

function legibleTextColor(bgHex) {
  // Simple luminance check reused from theme.js's rule of thumb: light
  // accents (yellow) get dark text, everything else gets white.
  const n = hexToNum(bgHex);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.6 ? '#121212' : '#ffffff';
}

/// A full-screen dim overlay plus a centered panel. Blocks input to
/// whatever is behind it. Returns { panel, close } — add content to
/// [panel] (a Container centered on screen) and call close() when done.
export function showModal(scene, { panelWidth = 300, panelHeight = 260 } = {}) {
  const { width, height } = scene.scale;
  const depthBase = 1000;

  const overlay = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(depthBase);
  overlay.setInteractive();

  const panel = scene.add.container(width / 2, height / 2).setDepth(depthBase + 1);
  const bg = scene.add.graphics();
  bg.fillStyle(hexToNum(AppColors.surface), 1);
  bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 18);
  panel.add(bg);

  function close() {
    overlay.destroy();
    panel.destroy();
  }

  return { panel, overlay, close, panelWidth, panelHeight };
}
