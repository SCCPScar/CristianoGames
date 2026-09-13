import Phaser from 'phaser';
import { ZumaGame } from '../games/zuma/zumaGame.js';
import { AppColors, OkabeIto, ballStyles, hexToNum, lerpColorNum, legibleForegroundOn } from '../shared/theme.js';
import { drawIcon } from '../shared/icons.js';
import { showPauseDialog, showGameOverDialog } from '../shared/dialogs.js';

const GLASS_DARK = 0x1c1430;
const NEON_CYAN = '#7ee0f0';
const CRYSTAL_LIGHT = '#c9b6ff';
const CRYSTAL_DEEP = '#4d2f9e';
const CAVE_DEEP = 0x08050f;
const CAVE_MID = 0x221836;

const DUST_SPECKS = [
  { x: 0.10, y: 0.06 }, { x: 0.85, y: 0.10 }, { x: 0.92, y: 0.42 },
  { x: 0.06, y: 0.46 }, { x: 0.15, y: 0.90 }, { x: 0.88, y: 0.88 },
  { x: 0.55, y: 0.05 }, { x: 0.05, y: 0.70 }, { x: 0.93, y: 0.68 },
];

/// Draws a soft "neon tube": several widening, fading passes underneath a
/// thin crisp core — the classic layered-stroke trick for faux bloom
/// without needing a WebGL-only blur pipeline.
function strokeGlowPath(g, points, colorHex, coreWidth) {
  const color = hexToNum(colorHex);
  const passes = [
    { width: coreWidth * 7, alpha: 0.05 },
    { width: coreWidth * 4.5, alpha: 0.10 },
    { width: coreWidth * 2.6, alpha: 0.2 },
    { width: coreWidth * 1.5, alpha: 0.4 },
  ];
  for (const pass of passes) {
    g.lineStyle(pass.width, color, pass.alpha);
    strokePolyline(g, points);
  }
  g.lineStyle(coreWidth, color, 1);
  strokePolyline(g, points);
}

function strokePolyline(g, points) {
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  g.strokePath();
}

function fillGlowCircle(g, cx, cy, radius, colorHex, baseAlpha = 0.55) {
  const color = hexToNum(colorHex);
  const steps = 4;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    g.fillStyle(color, (baseAlpha * (1 - t + 0.15)) / steps);
    g.fillCircle(cx, cy, radius * (0.6 + 0.4 * t));
  }
}

export class ZumaScene extends Phaser.Scene {
  constructor() {
    super('Zuma');
  }

  create() {
    this.zGame = new ZumaGame();
    this._dialogOpen = false;
    this._aiming = false;
    this._aimTarget = null;

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(AppColors.background);

    this.boardTop = 96;
    this.boardHeight = height - this.boardTop - 10;
    this.boardWidth = width - 20;
    this.boardX = (width - this.boardWidth) / 2;
    this.zGame.setBoardSize(this.boardWidth, this.boardHeight);

    this.add
      .text(20, 20, '←', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: AppColors.textPrimary })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Home'));

    this.hudText = this.add
      .text(width / 2, 24, '', { fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: AppColors.textPrimary })
      .setOrigin(0.5);

    this.add
      .text(width - 24, 20, '⏸', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: AppColors.textPrimary })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._openPauseMenu());

    this.nextLabel = this.add.text(0, 60, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: AppColors.textSecondary }).setOrigin(0, 0.5);
    this.nextBallGraphics = this.add.graphics();

    this._staticLayer = this.add.graphics();
    this._drawStaticLayer();

    this._dynamicLayer = this.add.graphics();

    const zone = this.add.zone(this.boardX, this.boardTop, this.boardWidth, this.boardHeight).setOrigin(0).setInteractive();
    zone.on('pointerdown', (pointer) => {
      this._aiming = true;
      this._aimTarget = { x: pointer.x, y: pointer.y };
    });
    zone.on('pointermove', (pointer) => {
      if (this._aiming) this._aimTarget = { x: pointer.x, y: pointer.y };
    });
    zone.on('pointerup', (pointer) => {
      if (this._aiming) this.zGame.fire({ x: pointer.x, y: pointer.y });
      this._aiming = false;
      this._aimTarget = null;
    });

    this._updateHud();
  }

  _drawStaticLayer() {
    const g = this._staticLayer;
    const { boardX: x, boardTop: y, boardWidth: w, boardHeight: h } = this;
    const center = { x: x + w * this.zGame.path.center.x, y: y + h * this.zGame.path.center.y };

    // Cave background: layered circles approximate a radial gradient.
    g.fillStyle(CAVE_DEEP, 1);
    g.fillRect(x, y, w, h);
    const steps = 24;
    const maxR = Math.max(w, h) * 0.85;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      g.fillStyle(lerpColorNum(CAVE_MID, CAVE_DEEP, t), 1);
      g.fillCircle(center.x, center.y, maxR * t);
    }

    g.fillStyle(hexToNum(CRYSTAL_LIGHT), 0.55);
    for (const speck of DUST_SPECKS) {
      g.fillCircle(x + speck.x * w, y + speck.y * h, 1.6);
    }

    // Track: dark glass channel, then a glowing neon edge on top.
    const points = this.zGame.path.pixelPoints(w, h).map((p) => ({ x: x + p.x, y: y + p.y }));
    const r = this.zGame.ballRadius;
    g.lineStyle(r * 2 + 8, GLASS_DARK, 1);
    strokePolyline(g, points);
    g.lineStyle(r * 1.7, 0x000000, 0.35);
    strokePolyline(g, points);
    strokeGlowPath(g, points, NEON_CYAN, 2.0);

    this._drawCornerBrackets(g, x, y, w, h);
    this._drawGoal(g);
  }

  _drawCornerBrackets(g, x, y, w, h) {
    const inset = 14, arm = 26;
    const corners = [
      [{ x: x + inset, y: y + inset + arm }, { x: x + inset, y: y + inset }, { x: x + inset + arm, y: y + inset }],
      [{ x: x + w - inset - arm, y: y + inset }, { x: x + w - inset, y: y + inset }, { x: x + w - inset, y: y + inset + arm }],
      [{ x: x + inset, y: y + h - inset - arm }, { x: x + inset, y: y + h - inset }, { x: x + inset + arm, y: y + h - inset }],
      [{ x: x + w - inset - arm, y: y + h - inset }, { x: x + w - inset, y: y + h - inset }, { x: x + w - inset, y: y + h - inset - arm }],
    ];
    for (const corner of corners) strokeGlowPath(g, corner, NEON_CYAN, 1.6);
  }

  _drawGoal(g) {
    const local = this.zGame.path.pixelAt(this.zGame.path.totalLength, this.boardWidth, this.boardHeight);
    const pos = { x: this.boardX + local.x, y: this.boardTop + local.y };
    const r = this.zGame.ballRadius * 1.5;
    g.fillStyle(CAVE_MID, 1);
    g.fillCircle(pos.x, pos.y, r);
    g.fillStyle(0x050308, 0.7);
    g.fillCircle(pos.x, pos.y, r * 0.7);
    g.lineStyle(2, hexToNum(CRYSTAL_LIGHT), 0.75);
    g.strokeCircle(pos.x, pos.y, r);
    g.lineStyle(2.5, hexToNum(AppColors.danger), 1);
    g.strokeCircle(pos.x, pos.y, r - 3);

    this._goalIconText =
      this._goalIconText ||
      this.add.text(pos.x, pos.y, '⚠', { fontFamily: 'system-ui, sans-serif', fontSize: `${r}px`, color: AppColors.danger }).setOrigin(0.5);
    this._goalIconText.setPosition(pos.x, pos.y);
  }

  _updateHud() {
    this.hudText.setText(`Pontos: ${this.zGame.score} · Nível ${this.zGame.levelNumber}/${this.zGame.totalLevels}`);

    this.nextBallGraphics.clear();
    if (this._nextIconGraphics) this._nextIconGraphics.clear();
    const style = ballStyles[this.zGame.nextBall];
    this.nextLabel.setText('Próxima: ').setPosition(this.scale.width / 2 - 60, 60);
    const cx = this.scale.width / 2 - 15, cy = 60;
    this.nextBallGraphics.fillStyle(hexToNum(style.color), 1);
    this.nextBallGraphics.fillCircle(cx, cy, 14);
    drawIcon(this.nextBallGraphics, style.icon, cx, cy, 16, legibleForegroundOn(style.color));
  }

  _drawBall(g, pos, radius, type) {
    const style = ballStyles[type];
    const colorNum = hexToNum(style.color);
    const light = lerpColorNum(colorNum, 0xffffff, 0.55);
    const dark = lerpColorNum(colorNum, 0x000000, 0.35);

    fillGlowCircle(g, pos.x, pos.y, radius * 1.5, style.color, 0.5);

    g.fillStyle(colorNum, 1);
    g.fillCircle(pos.x, pos.y, radius);
    g.fillStyle(light, 0.35);
    g.fillCircle(pos.x - radius * 0.15, pos.y - radius * 0.2, radius * 0.75);
    g.fillStyle(dark, 0.25);
    g.fillCircle(pos.x + radius * 0.2, pos.y + radius * 0.25, radius * 0.6);
    g.fillStyle(colorNum, 1);
    g.fillCircle(pos.x, pos.y, radius * 0.7);

    g.lineStyle(1.5, 0x000000, 0.3);
    g.strokeCircle(pos.x, pos.y, radius);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(pos.x - radius * 0.35, pos.y - radius * 0.4, radius * 0.28);

    drawIcon(g, style.icon, pos.x, pos.y, radius * 1.1, legibleForegroundOn(style.color));
  }

  _drawShooter(g) {
    const pos = this.zGame.shooterPosition;
    const abs = { x: this.boardX + pos.x, y: this.boardTop + pos.y };
    const r = this.zGame.ballRadius * 1.9;

    g.fillStyle(hexToNum(CRYSTAL_DEEP), 0.4);
    g.fillEllipse(abs.x, abs.y + r * 0.55, r * 1.7, r * 0.5);

    const top = { x: abs.x, y: abs.y - r * 0.75 };
    const points = [
      top,
      { x: abs.x + r * 0.65, y: abs.y - r * 0.05 },
      { x: abs.x + r * 0.32, y: abs.y + r * 0.75 },
      { x: abs.x - r * 0.32, y: abs.y + r * 0.75 },
      { x: abs.x - r * 0.65, y: abs.y - r * 0.05 },
    ];
    g.fillStyle(hexToNum(CRYSTAL_DEEP), 1);
    g.fillPoints(points, true);
    g.fillStyle(hexToNum(CRYSTAL_LIGHT), 0.35);
    g.fillPoints([top, points[1], abs, points[4]], true);
    g.lineStyle(1.5, hexToNum(CRYSTAL_LIGHT), 0.8);
    g.strokePoints([...points, top], false);
    g.lineStyle(1.5, 0xffffff, 0.5);
    g.lineBetween(top.x, top.y, abs.x, abs.y + r * 0.15);

    this._drawBall(g, { x: abs.x, y: abs.y + r * 0.08 }, this.zGame.ballRadius, this.zGame.currentBall);
  }

  update(time, deltaMs) {
    if (!this.zGame || this._dialogOpen) return;
    const wasDone = this.zGame.isGameOver || this.zGame.isLevelComplete || this.zGame.isVictory;
    this.zGame.update(deltaMs / 1000);
    const isDone = this.zGame.isGameOver || this.zGame.isLevelComplete || this.zGame.isVictory;

    const g = this._dynamicLayer;
    g.clear();

    for (const ball of this.zGame.chain) {
      const p = this.zGame.path.pixelAt(ball.distance, this.boardWidth, this.boardHeight);
      this._drawBall(g, { x: this.boardX + p.x, y: this.boardTop + p.y }, this.zGame.ballRadius, ball.type);
    }
    for (const proj of this.zGame.projectiles) {
      this._drawBall(g, { x: this.boardX + proj.position.x, y: this.boardTop + proj.position.y }, this.zGame.ballRadius, proj.type);
    }

    if (this._aiming && this._aimTarget) {
      const origin = this.zGame.shooterPosition;
      g.lineStyle(1.6, hexToNum(NEON_CYAN), 0.5);
      g.lineBetween(this.boardX + origin.x, this.boardTop + origin.y, this._aimTarget.x, this._aimTarget.y);
    }

    this._drawShooter(g);
    this._drawPopups(g);

    this.hudText.setText(`Pontos: ${this.zGame.score} · Nível ${this.zGame.levelNumber}/${this.zGame.totalLevels}`);

    if (!wasDone && isDone) {
      this._showEndDialog();
    }
  }

  _drawPopups(g) {
    if (!this._popupTexts) this._popupTexts = [];
    for (const t of this._popupTexts) t.destroy();
    this._popupTexts = [];
    for (const popup of this.zGame.popups) {
      const t = (popup.age / 0.9);
      const opacity = 1 - t;
      const x = this.boardX + popup.position.x;
      const y = this.boardTop + popup.position.y - t * 46;
      const text = this.add
        .text(x, y, `+${popup.amount}`, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: NEON_CYAN })
        .setOrigin(0.5)
        .setAlpha(Math.max(0, opacity));
      this._popupTexts.push(text);
    }
  }

  _openPauseMenu() {
    if (this.zGame.isGameOver || this.zGame.isPaused || this.zGame.isLevelComplete || this.zGame.isVictory || this._dialogOpen) return;
    this.zGame.pause();
    this._dialogOpen = true;
    showPauseDialog(this, {
      onResume: () => {
        this._dialogOpen = false;
        this.zGame.resume();
      },
      onExit: () => {
        this._dialogOpen = false;
        this.scene.start('Home');
      },
    });
  }

  _showEndDialog() {
    this._dialogOpen = true;
    const isLoss = this.zGame.isGameOver;
    showGameOverDialog(this, {
      isVictory: !isLoss,
      score: this.zGame.score,
      bestScore: this.zGame.highScore,
      isNewRecord: this.zGame.isNewRecord,
      onNext: this.zGame.isLevelComplete
        ? () => {
            this._dialogOpen = false;
            this.zGame.nextLevel();
          }
        : null,
      onPlayAgain: () => {
        this._dialogOpen = false;
        this.zGame.reset();
      },
      onMenu: () => {
        this._dialogOpen = false;
        this.scene.start('Home');
      },
    });
  }
}
