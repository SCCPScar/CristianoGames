import Phaser from 'phaser';
import { ZumaGame } from '../games/zuma/zumaGame.js';
import { AppColors, hexToNum, lerpColorNum } from '../shared/theme.js';
import { showPauseDialog, showGameOverDialog } from '../shared/dialogs.js';

const STONE_DEEP = 0x120d08;
const STONE_MID = 0x3c3122;
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
    this.load.image('ornament', 'assets/zuma/ornament.png');
    this.load.image('stone_texture', 'assets/zuma/stone_texture.png');
  }

  create() {
    this.zGame = new ZumaGame();
    this._dialogOpen = false;
    this._aiming = false;
    this._aimTarget = null;
    this._ballPool = [];

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
    this.nextBallImage = this.add.image(0, 60, 'ball_amber').setDisplaySize(28, 28).setDepth(20);

    this._staticLayer = this.add.graphics();
    this._drawStaticLayer();

    this._dynamicLayer = this.add.graphics().setDepth(5);

    this._createShooter();

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

    // Stone cave background: layered circles approximate a radial gradient.
    g.fillStyle(STONE_DEEP, 1);
    g.fillRect(x, y, w, h);
    const steps = 24;
    const maxR = Math.max(w, h) * 0.85;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      g.fillStyle(lerpColorNum(STONE_MID, STONE_DEEP, t), 1);
      g.fillCircle(center.x, center.y, maxR * t);
    }

    g.fillStyle(hexToNum(GOLD_LIGHT), 0.25);
    for (const speck of DUST_SPECKS) {
      g.fillCircle(x + speck.x * w, y + speck.y * h, 1.4);
    }

    // Track: a carved stone channel — dark bevel edge, stone fill, thin
    // worn-gold centerline.
    const points = this.zGame.path.pixelPoints(w, h).map((p) => ({ x: x + p.x, y: y + p.y }));
    const r = this.zGame.ballRadius;
    g.lineStyle(r * 2 + 10, TRACK_SHADOW, 1);
    strokePolyline(g, points);
    g.lineStyle(r * 2 + 2, TRACK_STONE, 1);
    strokePolyline(g, points);
    g.lineStyle(r * 1.7, 0x000000, 0.22);
    strokePolyline(g, points);
    g.lineStyle(1.5, hexToNum(GOLD), 0.35);
    strokePolyline(g, points);

    this._drawGoal(g);

    this._addTopBottomStrips(x, y, w, h);
    this._addCornerOrnaments(x, y, w, h);
  }

  _addTopBottomStrips(x, y, w, h) {
    const stripHeight = 34;
    const tex = this.textures.get('stone_texture').getSourceImage();
    const scale = stripHeight / tex.height;
    const top = this.add.tileSprite(x, y, w, stripHeight, 'stone_texture').setOrigin(0, 0).setDepth(1);
    top.tileScaleX = scale;
    top.tileScaleY = scale;
    const bottom = this.add.tileSprite(x, y + h - stripHeight, w, stripHeight, 'stone_texture').setOrigin(0, 0).setDepth(1);
    bottom.tileScaleX = scale;
    bottom.tileScaleY = scale;
  }

  _addCornerOrnaments(x, y, w, h) {
    const size = 64;
    const inset = 4;
    const positions = [
      { cx: x + inset, cy: y + inset, flipX: true, flipY: true },
      { cx: x + w - inset, cy: y + inset, flipX: false, flipY: true },
      { cx: x + inset, cy: y + h - inset, flipX: true, flipY: false },
      { cx: x + w - inset, cy: y + h - inset, flipX: false, flipY: false },
    ];
    for (const p of positions) {
      this.add
        .image(p.cx, p.cy, 'ornament')
        .setDisplaySize(size, size)
        .setOrigin(p.flipX ? 1 : 0, p.flipY ? 1 : 0)
        .setFlip(p.flipX, p.flipY)
        .setDepth(2);
    }
  }

  _createShooter() {
    const pos = this.zGame.shooterPosition;
    const abs = { x: this.boardX + pos.x, y: this.boardTop + pos.y };
    const r = this.zGame.ballRadius;

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

    this._shooterMouth = { x: abs.x - r * 0.15, y: abs.y - r * 0.1 };
  }

  _updateHud() {
    this.hudText.setText(`Pontos: ${this.zGame.score} · Nível ${this.zGame.levelNumber}/${this.zGame.totalLevels}`);

    const type = this.zGame.nextBall;
    this.nextLabel.setText('Próxima: ').setPosition(this.scale.width / 2 - 60, 60);
    this.nextBallImage.setTexture(`ball_${type}`).setPosition(this.scale.width / 2 - 15, 60);
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

    this._ballIndex = 0;
    for (const ball of this.zGame.chain) {
      const p = this.zGame.path.pixelAt(ball.distance, this.boardWidth, this.boardHeight);
      this._placeBall(this._ballIndex++, ball.type, this.boardX + p.x, this.boardTop + p.y);
    }
    for (const proj of this.zGame.projectiles) {
      this._placeBall(this._ballIndex++, proj.type, this.boardX + proj.position.x, this.boardTop + proj.position.y);
    }
    this._drawShooterBall();
    for (let i = this._ballIndex; i < this._ballPool.length; i++) {
      if (this._ballPool[i]) this._ballPool[i].setVisible(false);
    }

    if (this._aiming && this._aimTarget) {
      const origin = this.zGame.shooterPosition;
      g.lineStyle(1.6, hexToNum(GOLD), 0.6);
      g.lineBetween(this.boardX + origin.x, this.boardTop + origin.y, this._aimTarget.x, this._aimTarget.y);
    }

    this._drawPopups(g);

    this.hudText.setText(`Pontos: ${this.zGame.score} · Nível ${this.zGame.levelNumber}/${this.zGame.totalLevels}`);

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
      this.add.text(pos.x, pos.y, '⚠', { fontFamily: 'system-ui, sans-serif', fontSize: `${r}px`, color: AppColors.danger }).setOrigin(0.5).setDepth(3);
    this._goalIconText.setPosition(pos.x, pos.y);
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
        .text(x, y, `+${popup.amount}`, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: GOLD })
        .setOrigin(0.5)
        .setDepth(20)
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
