import Phaser from 'phaser';
import { AppColors, OkabeIto, hexToNum } from '../shared/theme.js';
import { GameId, getHighScore, getSoundEnabled, setSoundEnabled, getHapticsEnabled, setHapticsEnabled, syncRemoteScores } from '../shared/storage.js';
import { makeButton, showModal } from '../shared/ui.js';
import { getSafeAreaInsets } from '../shared/safeArea.js';
import { setOrientation } from '../shared/orientation.js';

/// Home screen: app title, settings gear, and a 2x2 grid of large,
/// shape-distinct cards to pick a game. Icons differ in silhouette (not
/// just color) so they stay distinguishable in grayscale.
export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create() {
    setOrientation(this, 'landscape');
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(AppColors.background);
    this._cards = [];

    this.add.text(width / 2, 32, 'CrisTetris', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: AppColors.textPrimary,
    }).setOrigin(0.5);

    this._addSettingsButton();

    const cardW = 208, cardH = 168, gapX = 22, gapY = 16;
    const gridW = cardW * 2 + gapX;
    const gridH = cardH * 2 + gapY;
    const gridLeft = width / 2 - gridW / 2 + cardW / 2;
    const gridTop = 58 + (height - 58) / 2 - gridH / 2 + cardH / 2;
    const cols = [gridLeft, gridLeft + cardW + gapX];
    const rows = [gridTop, gridTop + cardH + gapY];

    this._addGameCard({ x: cols[0], y: rows[0], w: cardW, h: cardH, title: 'TETRIS', accent: OkabeIto.skyBlue, game: GameId.TETRIS, scene: 'Tetris', drawIcon: this._drawTetrisIcon.bind(this) });
    this._addGameCard({ x: cols[1], y: rows[0], w: cardW, h: cardH, title: 'ZUMA', accent: OkabeIto.reddishPurple, game: GameId.ZUMA, scene: 'Zuma', drawIcon: this._drawZumaIcon.bind(this) });
    this._addGameCard({ x: cols[0], y: rows[1], w: cardW, h: cardH, title: 'LIGAR 4', accent: OkabeIto.orange, game: GameId.CONNECT4, scene: 'Connect4', drawIcon: this._drawConnect4Icon.bind(this) });
    this._addGameCard({ x: cols[1], y: rows[1], w: cardW, h: cardH, title: 'SEQUÊNCIA', accent: OkabeIto.bluishGreen, game: GameId.SEQUENCE, scene: 'Sequence', drawIcon: this._drawSequenceIcon.bind(this) });

    // Best-effort: pulls each game's all-time best from the backend and
    // raises the local record where the remote is ahead (e.g. set on
    // another device) — refresh the cards already on screen if so.
    syncRemoteScores().then(() => {
      for (const card of this._cards) {
        card.recordText.setText(`Recorde: ${getHighScore(card.gameId)}`);
      }
    });
  }

  _addSettingsButton() {
    const { width } = this.scale;
    const safe = getSafeAreaInsets(this);
    const cx = width - 40 - safe.right, cy = 40 + safe.top;
    const btn = this.add.circle(cx, cy, 20, hexToNum(AppColors.surface)).setInteractive({ useHandCursor: true });
    this.add.text(cx, cy, '⚙', { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: AppColors.textPrimary }).setOrigin(0.5);
    btn.on('pointerup', () => this._openSettings());
    this._gearButton = btn;
  }

  /// Redraws the whole dialog on every toggle — simpler than patching
  /// individual buttons in place, and this dialog is cheap to rebuild.
  _openSettings() {
    // The cards and gear icon sit underneath and must not react to clicks
    // meant for the dialog's buttons while it's open — see showModal()'s
    // blockers doc comment for why the overlay alone isn't enough.
    const blockers = [this._gearButton, ...this._cards];
    const { panel, close, centerX, centerY, trackExtra } = showModal(this, { panelWidth: 280, panelHeight: 230, blockers });

    panel.add(
      this.add.text(0, -85, '⚙  Configurações', { fontFamily: 'system-ui, sans-serif', fontSize: '19px', fontStyle: 'bold', color: AppColors.textPrimary }).setOrigin(0.5),
    );

    const soundOn = getSoundEnabled();
    trackExtra(
      makeButton(this, {
        x: centerX,
        y: centerY - 15,
        width: 220,
        label: soundOn ? '🔊  Som: Ligado' : '🔈  Som: Desligado',
        bgColor: soundOn ? AppColors.accent : AppColors.surfaceHigh,
        onClick: () => {
          setSoundEnabled(!soundOn);
          close();
          this._openSettings();
        },
      }),
    );

    const hapticsOn = getHapticsEnabled();
    trackExtra(
      makeButton(this, {
        x: centerX,
        y: centerY + 50,
        width: 220,
        label: hapticsOn ? '📳  Vibração: Ligada' : '📴  Vibração: Desligada',
        bgColor: hapticsOn ? AppColors.accent : AppColors.surfaceHigh,
        onClick: () => {
          setHapticsEnabled(!hapticsOn);
          close();
          this._openSettings();
        },
      }),
    );

    trackExtra(
      makeButton(this, {
        x: centerX,
        y: centerY + 105,
        width: 160,
        height: 44,
        label: 'Fechar',
        filled: false,
        bgColor: AppColors.textSecondary,
        onClick: close,
      }),
    );
  }

  _addGameCard({ x, y, w, h, title, accent, game, scene, drawIcon }) {
    const container = this.add.container(x, y);

    const g = this.add.graphics();
    g.fillStyle(hexToNum(AppColors.surface), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(2, hexToNum(accent), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    container.add(g);

    drawIcon(container, accent, -h * 0.2);

    container.add(
      this.add.text(0, h * 0.08, title, { fontFamily: 'system-ui, sans-serif', fontSize: '19px', fontStyle: 'bold', color: AppColors.textPrimary }).setOrigin(0.5),
    );

    const highScore = getHighScore(game);
    const recordText = this.add
      .text(0, h * 0.32, `Recorde: ${highScore}`, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: AppColors.textSecondary })
      .setOrigin(0.5);
    container.add(recordText);
    container.recordText = recordText;
    container.gameId = game;

    container.setSize(w, h);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    container.on('pointerdown', () => container.setScale(0.98));
    container.on('pointerup', () => {
      container.setScale(1);
      this.scene.start(scene);
    });
    container.on('pointerout', () => container.setScale(1));
    this._cards.push(container);
  }

  _drawTetrisIcon(container, accent, offsetY = 0) {
    const g = this.add.graphics();
    g.fillStyle(hexToNum(accent), 1);
    const barWidth = 14;
    const gap = 8;
    const heights = [26, 42, 34];
    heights.forEach((h, i) => {
      const x = (i - 1) * (barWidth + gap);
      g.fillRoundedRect(x - barWidth / 2, offsetY - h / 2, barWidth, h, 3);
    });
    container.add(g);
  }

  _drawZumaIcon(container, accent, offsetY = 0) {
    const g = this.add.graphics();
    g.fillStyle(hexToNum(accent), 1);
    const radii = [8, 10, 10, 8];
    let x = -36;
    for (const r of radii) {
      g.fillCircle(x, offsetY, r);
      x += r * 2 + 4;
    }
    container.add(g);
  }

  /// A 4x3 grid of dots (a little board of tokens) — reads as "grid",
  /// not "row of circles" like the Zuma icon, so the two stay distinct
  /// in silhouette even though both use circles.
  _drawConnect4Icon(container, accent, offsetY = 0) {
    const g = this.add.graphics();
    const cols = 4, rows = 3, r = 6, gap = 8;
    const w = (cols - 1) * (r * 2 + gap);
    const h = (rows - 1) * (r * 2 + gap);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const dropped = row === rows - 1 || (row === rows - 2 && (col === 1 || col === 2));
        g.fillStyle(hexToNum(dropped ? accent : AppColors.surfaceHigh), 1);
        g.fillCircle(-w / 2 + col * (r * 2 + gap), offsetY - h / 2 + row * (r * 2 + gap), r);
      }
    }
    container.add(g);
  }

  /// Four quarter-wedges around a center point (a Simon/Genius button
  /// layout) — a pie silhouette, unlike any other card's icon.
  _drawSequenceIcon(container, accent, offsetY = 0) {
    const g = this.add.graphics();
    const rOuter = 26, rInner = 5;
    const colors = [accent, OkabeIto.vermillion, OkabeIto.skyBlue, OkabeIto.yellow];
    for (let i = 0; i < 4; i++) {
      const start = (Math.PI / 2) * i - Math.PI / 4;
      const end = start + Math.PI / 2 - 0.06;
      g.fillStyle(hexToNum(colors[i]), 1);
      g.beginPath();
      g.slice(0, offsetY, rOuter, start, end, false);
      g.fillPath();
    }
    g.fillStyle(hexToNum(AppColors.surface), 1);
    g.fillCircle(0, offsetY, rInner);
    container.add(g);
  }
}
