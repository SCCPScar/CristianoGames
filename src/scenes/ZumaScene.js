import Phaser from 'phaser';
import { ZumaGame } from '../games/zuma/zumaGame.js';
import { AppColors, ballStyles, hexToNum, lerpColorNum } from '../shared/theme.js';
import { showPauseDialog, showGameOverDialog } from '../shared/dialogs.js';
import { getSafeAreaInsets } from '../shared/safeArea.js';
import { setOrientation } from '../shared/orientation.js';

const STONE_DEEP = 0x120d08;
const STONE_MID = 0x3c3122;
const VIGNETTE_DARK = 0x080503;
const TRACK_STONE = 0x584a35;
const TRACK_SHADOW = 0x1c150c;
const GOLD = '#d9a520';
const GOLD_LIGHT = '#f4d78a';

const DUST_SPECKS = [
  { x: 0.10, y: 0.06 }, { x: 0.85, y: 0.10 }, { x: 0.92, y: 0.42 },
  { x: 0.06, y: 0.46 }, { x: 0.15, y: 0.90 }, { x: 0.88, y: 0.88 },
  { x: 0.55, y: 0.05 }, { x: 0.05, y: 0.70 }, { x: 0.93, y: 0.68 },
];

function strokePolyline(g, points) {
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  g.strokePath();
}

export class ZumaScene extends Phaser.Scene {
  constructor() {
    super('Zuma');
  }

  preload() {
    this.load.image('ball_amber', 'assets/zuma/ball_amber.png');
    this.load.image('ball_sky', 'assets/zuma/ball_sky.png');
    this.load.image('ball_green', 'assets/zuma/ball_green.png');
    this.load.image('ball_purple', 'assets/zuma/ball_purple.png');
    this.load.image('ball_vermillion', 'assets/zuma/ball_vermillion.png');
    this.load.image('panda_shooter', 'assets/zuma/panda.png');
    this.load.image('stone_texture', 'assets/zuma/stone_texture.png');
    this.load.image('border_top', 'assets/zuma/border_top.png');
    this.load.image('border_bottom', 'assets/zuma/border_bottom.png');
  }

  create() {
    setOrientation(this, 'landscape');
    this.zGame = new ZumaGame();
    this._dialogOpen = false;
    this._aiming = false;
    this._aimTarget = null;
    this._ballPool = [];

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(AppColors.background);

    const safe = getSafeAreaInsets(this);
    this.boardTop = 58 + safe.top;
    this.boardHeight = height - this.boardTop - 10 - safe.bottom;
    this.boardWidth = width - 20 - safe.left - safe.right;
    this.boardX = safe.left + (width - safe.left - safe.right - this.boardWidth) / 2;
    this.zGame.setBoardSize(this.boardWidth, this.boardHeight);

    this._makeParticleTexture();

    this._staticLayer = this.add.graphics();
    this._trackLayer = this.add.graphics().setDepth(3);
    this._drawStaticLayer();

    this._dynamicLayer = this.add.graphics().setDepth(5);

    this._createShooter();
    this._buildHud();

    const zone = this.add.zone(this.boardX, this.boardTop, this.boardWidth, this.boardHeight).setOrigin(0).setInteractive();
    zone.on('pointerdown', (pointer) => {
      this._aiming = true;
      this._aimTarget = { x: pointer.x, y: pointer.y };
    });
    zone.on('pointermove', (pointer) => {
      if (this._aiming) this._aimTarget = { x: pointer.x, y: pointer.y };
    });
    zone.on('pointerup', (pointer) => {
      if (this._aiming) {
        this.zGame.fire({ x: pointer.x, y: pointer.y });
        this._pulsePanda();
      }
      this._aiming = false;
      this._aimTarget = null;
    });

    this._updateHud();
  }

  /// A tiny white dot texture, generated once, reused (tinted) for every
  /// particle burst — cheap on a mobile GPU vs. per-effect textures.
  _makeParticleTexture() {
    if (this.textures.exists('particle_dot')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle_dot', 8, 8);
    g.destroy();
  }

  _buildHud() {
    const { width } = this.scale;
    const safe = getSafeAreaInsets(this);

    this.add
      .text(20 + safe.left, 14 + safe.top, '←', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: AppColors.textPrimary })
      .setInteractive({ useHandCursor: true })
      .setDepth(20)
      .on('pointerup', () => this.scene.start('Home'));

    this.add
      .text(width - 22 - safe.right, 12 + safe.top, '⏸', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: AppColors.textPrimary })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._openPauseMenu());

    this.levelText = this.add
      .text(width / 2, 4 + safe.top, '', { fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold', color: GOLD_LIGHT, letterSpacing: 1 })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.scoreText = this.add
      .text(width / 2, 17 + safe.top, '', { fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: AppColors.textPrimary })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.progressBarGraphics = this.add.graphics().setDepth(20);
    this._hudTop = safe.top;

    // Kept entirely within the plain HUD strip above the board (not
    // overlapping the carved border art below it) so the small ball icon
    // reads clearly instead of competing with a busy textured background
    // — plus a dark backing disc for guaranteed contrast regardless. Far
    // enough from the pause button (at width-22) that the two never touch.
    const nextX = width - 76 - safe.right;
    this.nextLabel = this.add
      .text(nextX, 4 + safe.top, 'PRÓXIMA', { fontFamily: 'system-ui, sans-serif', fontSize: '9px', color: AppColors.textSecondary, letterSpacing: 0.5 })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.add.circle(nextX, 34 + safe.top, 15, hexToNum(AppColors.surfaceHigh), 1).setDepth(19);
    this.nextBallImage = this.add.image(nextX, 34 + safe.top, 'ball_amber').setDisplaySize(24, 24).setDepth(20);
  }

  _drawStaticLayer() {
    const g = this._staticLayer;
    const { boardX: x, boardTop: y, boardWidth: w, boardHeight: h } = this;
    const center = { x: x + w * this.zGame.path.center.x, y: y + h * this.zGame.path.center.y };

    // Stone cave background: layered circles approximate a radial gradient,
    // darkening further toward the edges for a vignette.
    g.fillStyle(VIGNETTE_DARK, 1);
    g.fillRect(x, y, w, h);
    const steps = 28;
    // Reach exactly to the board's farthest corner (not just
    // max(w,h)*0.95) — a wide board's actual corners sit much farther
    // from center than that, so undershooting here left a big flat,
    // untextured plateau of solid VIGNETTE_DARK out past where the last
    // ring's shading could reach.
    const maxR = Math.hypot(Math.max(center.x - x, x + w - center.x), Math.max(center.y - y, y + h - center.y));
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const color = t > 0.7 ? lerpColorNum(STONE_DEEP, VIGNETTE_DARK, (t - 0.7) / 0.3) : lerpColorNum(STONE_MID, STONE_DEEP, t / 0.7);
      g.fillStyle(color, 1);
      g.fillCircle(center.x, center.y, maxR * t);
    }

    // Very subtle carved-stone texture over the whole board — barely
    // visible, just enough to avoid a flat fill.
    const tex = this.textures.get('stone_texture').getSourceImage();
    const texScale = (h * 1.1) / tex.height;
    const textureOverlay = this.add.tileSprite(x, y, w, h, 'stone_texture').setOrigin(0, 0).setDepth(1).setAlpha(0.07);
    textureOverlay.tileScaleX = texScale;
    textureOverlay.tileScaleY = texScale;

    g.fillStyle(hexToNum(GOLD_LIGHT), 0.2);
    for (const speck of DUST_SPECKS) {
      g.fillCircle(x + speck.x * w, y + speck.y * h, 1.4);
    }

    this._drawTrack();
    this._drawGoal(this._trackLayer);

    this._addTopBottomStrips(x, y, w, h);
  }

  /// The border art is cropped from a wide carved-stone frieze at its own
  /// native aspect ratio (~15.6:1) — scaled up/down UNIFORMLY to fit the
  /// board's width, never stretched independently on one axis, so it
  /// never distorts regardless of how wide the board ends up.
  _addTopBottomStrips(x, y, w, h) {
    const tex = this.textures.get('border_top').getSourceImage();
    const stripHeight = w * (tex.height / tex.width);
    this.add.image(x, y, 'border_top').setOrigin(0, 0).setDisplaySize(w, stripHeight).setDepth(2);
    this.add.image(x, y + h, 'border_bottom').setOrigin(0, 1).setDisplaySize(w, stripHeight).setDepth(2);
  }

  /// A carved stone channel: soft outer shadow (the groove reads as cut
  /// into the surrounding stone), a dark bevel edge, the stone fill, an
  /// inner shadow, and a thin worn-gold centerline for a polished look.
  _drawTrack() {
    const g = this._trackLayer;
    const { boardX: x, boardTop: y, boardWidth: w, boardHeight: h } = this;
    const points = this.zGame.path.pixelPoints(w, h).map((p) => ({ x: x + p.x, y: y + p.y }));
    const r = this.zGame.ballRadius;

    g.lineStyle(r * 2 + 20, 0x000000, 0.22);
    strokePolyline(g, points);
    g.lineStyle(r * 2 + 10, TRACK_SHADOW, 1);
    strokePolyline(g, points);
    g.lineStyle(r * 2 + 2, TRACK_STONE, 1);
    strokePolyline(g, points);
    g.lineStyle(r * 1.7, 0x000000, 0.28);
    strokePolyline(g, points);
    g.lineStyle(r * 0.5, 0xffffff, 0.05);
    strokePolyline(g, points);
    g.lineStyle(1.5, hexToNum(GOLD), 0.4);
    strokePolyline(g, points);
  }


  _createShooter() {
    const pos = this.zGame.shooterPosition;
    const abs = { x: this.boardX + pos.x, y: this.boardTop + pos.y };
    const r = this.zGame.ballRadius;

    // A stone dais integrates the panda into the board instead of it
    // floating as a separate cut-out image.
    const platR = r * 2.6;
    const platform = this.add.graphics().setDepth(6);
    platform.fillStyle(0x000000, 0.4);
    platform.fillEllipse(abs.x, abs.y + platR * 0.3, platR * 2.15, platR * 0.85);
    platform.fillStyle(TRACK_SHADOW, 1);
    platform.fillCircle(abs.x, abs.y, platR);
    platform.fillStyle(STONE_MID, 1);
    platform.fillCircle(abs.x, abs.y, platR * 0.88);
    platform.fillStyle(0x000000, 0.3);
    platform.fillCircle(abs.x, abs.y, platR * 0.6);
    platform.lineStyle(2.5, hexToNum(GOLD), 0.55);
    platform.strokeCircle(abs.x, abs.y, platR);
    platform.lineStyle(1, hexToNum(GOLD_LIGHT), 0.25);
    platform.strokeCircle(abs.x, abs.y, platR * 0.88);

    this.add.circle(abs.x, abs.y, platR * 1.2, hexToNum(GOLD_LIGHT), 0.1).setDepth(6.5).setBlendMode(Phaser.BlendModes.ADD);

    // TEMP (diagnostic, not committed): panda hidden so the chain near
    // the center is visible again — see if the platform/glow alone reads
    // well, then decide whether to shrink/reposition the panda instead
    // of dropping it for good.
    const PANDA_VISIBLE = false;
    if (PANDA_VISIBLE) {
      const tex = this.textures.get('panda_shooter').getSourceImage();
      const pandaWidth = r * 7.4;
      const pandaHeight = pandaWidth * (tex.height / tex.width);

      // Origin is placed at the panda's mouth (estimated fraction of the
      // sprite) so its position directly IS the shooter/ball-spawn point.
      this._panda = this.add
        .image(abs.x, abs.y, 'panda_shooter')
        .setOrigin(0.905, 0.5)
        .setDisplaySize(pandaWidth, pandaHeight)
        .setDepth(15);
    }

    this._shooterMouth = { x: abs.x, y: abs.y };
  }

  /// A quick squash-and-settle on fire — cheap, readable "launch" feedback
  /// without shaking the camera.
  _pulsePanda() {
    if (!this._panda) return;
    const baseX = this._panda.scaleX, baseY = this._panda.scaleY;
    this.tweens.add({
      targets: this._panda,
      scaleX: baseX * 1.05,
      scaleY: baseY * 0.93,
      duration: 80,
      yoyo: true,
      ease: 'Quad.Out',
    });
  }

  _spawnImpactFlash(type, x, y) {
    const r = this.zGame.ballRadius;
    const color = hexToNum(ballStyles[type].color);
    const flash = this.add.circle(x, y, r * 0.7, 0xffffff, 0.8).setDepth(12);
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 160, ease: 'Cubic.Out', onComplete: () => flash.destroy() });

    const emitter = this.add.particles(x, y, 'particle_dot', {
      speed: { min: 30, max: 90 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 220,
      quantity: 4,
      tint: color,
    });
    emitter.setDepth(13);
    this.time.delayedCall(260, () => emitter.destroy());
  }

  /// The signature "match" moment: the popped ball briefly scales up and
  /// fades (an echo of itself, not just vanishing), a bright ring flashes,
  /// and a few tinted sparks fly outward. All one-shot and self-destroying.
  _spawnMatchBurst(type, x, y) {
    const r = this.zGame.ballRadius;
    const color = hexToNum(ballStyles[type].color);

    const echo = this.add.image(x, y, `ball_${type}`).setDisplaySize(r * 2.1, r * 2.1).setDepth(11);
    this.tweens.add({
      targets: echo,
      scaleX: echo.scaleX * 1.7,
      scaleY: echo.scaleY * 1.7,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.Out',
      onComplete: () => echo.destroy(),
    });

    const flash = this.add.circle(x, y, r * 0.8, hexToNum(GOLD_LIGHT), 0.9).setDepth(12);
    this.tweens.add({ targets: flash, scale: 2.6, alpha: 0, duration: 320, ease: 'Cubic.Out', onComplete: () => flash.destroy() });

    const emitter = this.add.particles(x, y, 'particle_dot', {
      speed: { min: 70, max: 190 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 360,
      quantity: 7,
      tint: [color, hexToNum(GOLD_LIGHT)],
    });
    emitter.setDepth(13);
    this.time.delayedCall(420, () => emitter.destroy());
  }

  _updateHud() {
    this.levelText.setText(`NÍVEL ${this.zGame.levelNumber}/${this.zGame.totalLevels}`);
    this.scoreText.setText(`${this.zGame.score}`);

    const barWidth = 130, barHeight = 5;
    const bx = this.scale.width / 2 - barWidth / 2;
    const by = 42 + (this._hudTop || 0);
    const g = this.progressBarGraphics;
    g.clear();
    g.fillStyle(hexToNum(AppColors.surfaceHigh), 0.8);
    g.fillRoundedRect(bx, by, barWidth, barHeight, 3);
    g.fillStyle(hexToNum(GOLD), 1);
    g.fillRoundedRect(bx, by, Math.max(4, barWidth * this.zGame.levelProgress), barHeight, 3);

    const type = this.zGame.nextBall;
    this.nextBallImage.setTexture(`ball_${type}`);
  }

  _placeBall(index, type, x, y) {
    const r = this.zGame.ballRadius;
    let img = this._ballPool[index];
    if (!img) {
      img = this.add.image(x, y, `ball_${type}`).setDepth(10);
      this._ballPool[index] = img;
    }
    img.setTexture(`ball_${type}`).setDisplaySize(r * 2.1, r * 2.1).setPosition(x, y).setVisible(true);
  }

  _drawShooterBall() {
    const pos = this._shooterMouth;
    this._placeBall(this._ballIndex++, this.zGame.currentBall, pos.x, pos.y);
  }

  update(time, deltaMs) {
    if (!this.zGame || this._dialogOpen) return;
    const wasDone = this.zGame.isGameOver || this.zGame.isLevelComplete || this.zGame.isVictory;
    this.zGame.update(deltaMs / 1000);
    const isDone = this.zGame.isGameOver || this.zGame.isLevelComplete || this.zGame.isVictory;

    const g = this._dynamicLayer;
    g.clear();

    const r = this.zGame.ballRadius;
    const drawContactShadow = (x, y) => {
      g.fillStyle(0x000000, 0.32);
      g.fillEllipse(x + r * 0.12, y + r * 0.4, r * 1.5, r * 0.5);
    };

    this._ballIndex = 0;
    for (const ball of this.zGame.chain) {
      const p = this.zGame.path.pixelAt(ball.distance, this.boardWidth, this.boardHeight);
      drawContactShadow(this.boardX + p.x, this.boardTop + p.y);
      this._placeBall(this._ballIndex++, ball.type, this.boardX + p.x, this.boardTop + p.y);
    }
    for (const proj of this.zGame.projectiles) {
      drawContactShadow(this.boardX + proj.position.x, this.boardTop + proj.position.y);
      this._placeBall(this._ballIndex++, proj.type, this.boardX + proj.position.x, this.boardTop + proj.position.y);
    }
    this._drawShooterBall();
    for (let i = this._ballIndex; i < this._ballPool.length; i++) {
      if (this._ballPool[i]) this._ballPool[i].setVisible(false);
    }

    for (const flash of this.zGame.drainImpactFlashes()) {
      this._spawnImpactFlash(flash.type, this.boardX + flash.position.x, this.boardTop + flash.position.y);
    }
    for (const burst of this.zGame.drainMatchBursts()) {
      this._spawnMatchBurst(burst.type, this.boardX + burst.position.x, this.boardTop + burst.position.y);
    }

    if (this._aiming && this._aimTarget) {
      const origin = this.zGame.shooterPosition;
      g.lineStyle(1.6, hexToNum(GOLD), 0.6);
      g.lineBetween(this.boardX + origin.x, this.boardTop + origin.y, this._aimTarget.x, this._aimTarget.y);
    }

    this._drawPopups();
    this._updateHud();

    if (!wasDone && isDone) {
      this._showEndDialog();
    }
  }

  _drawGoal(g) {
    const local = this.zGame.path.pixelAt(this.zGame.path.totalLength, this.boardWidth, this.boardHeight);
    const pos = { x: this.boardX + local.x, y: this.boardTop + local.y };
    const r = this.zGame.ballRadius * 1.5;
    g.fillStyle(STONE_MID, 1);
    g.fillCircle(pos.x, pos.y, r);
    g.fillStyle(0x050308, 0.7);
    g.fillCircle(pos.x, pos.y, r * 0.7);
    g.lineStyle(2, hexToNum(GOLD), 0.8);
    g.strokeCircle(pos.x, pos.y, r);
    g.lineStyle(2.5, hexToNum(AppColors.danger), 1);
    g.strokeCircle(pos.x, pos.y, r - 3);

    this._goalIconText =
      this._goalIconText ||
      this.add.text(pos.x, pos.y, '⚠', { fontFamily: 'system-ui, sans-serif', fontSize: `${r}px`, color: AppColors.danger }).setOrigin(0.5).setDepth(3.5);
    this._goalIconText.setPosition(pos.x, pos.y);
  }

  /// Score (and, on a combo, a "COMBO xN" callout) recomputed every frame
  /// straight from each popup's age — stateless, so no tween bookkeeping
  /// is needed for the rise-fade-and-punch motion.
  _drawPopups() {
    if (!this._popupTexts) this._popupTexts = [];
    for (const t of this._popupTexts) t.destroy();
    this._popupTexts = [];
    for (const popup of this.zGame.popups) {
      const t = popup.age / 0.9;
      const opacity = Math.max(0, 1 - t);
      const x = this.boardX + popup.position.x;
      const y = this.boardTop + popup.position.y - t * 46;
      const isCombo = popup.comboStep >= 2;
      const punch = Math.max(0, 1 - popup.age / 0.18);
      const scale = isCombo ? 1 + punch * 0.4 : 1;

      if (isCombo) {
        const comboText = this.add
          .text(x, y - 20, `★ COMBO x${popup.comboStep}`, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: GOLD_LIGHT })
          .setOrigin(0.5)
          .setDepth(21)
          .setAlpha(opacity)
          .setScale(scale);
        this._popupTexts.push(comboText);
      }
      const text = this.add
        .text(x, y, `+${popup.amount}`, { fontFamily: 'system-ui, sans-serif', fontSize: isCombo ? '20px' : '18px', fontStyle: 'bold', color: GOLD })
        .setOrigin(0.5)
        .setDepth(20)
        .setAlpha(opacity)
        .setScale(scale);
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
