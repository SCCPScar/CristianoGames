import Phaser from 'phaser';
import { AppColors, OkabeIto, hexToNum } from '../shared/theme.js';
import { GameId, getHighScore, getSoundEnabled, setSoundEnabled, getHapticsEnabled, setHapticsEnabled } from '../shared/storage.js';
import { makeButton, showModal } from '../shared/ui.js';
import { getSafeAreaInsets } from '../shared/safeArea.js';
import { setOrientation } from '../shared/orientation.js';

/// Home screen: app title, settings gear, and two large, shape-distinct
/// cards to pick a game. Icons differ in silhouette (not just color) so
/// they stay distinguishable in grayscale.
export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create() {
    setOrientation(this, 'landscape');
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(AppColors.background);
    this._cards = [];

    this.add.text(width / 2, 40, 'CrisTetris', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: AppColors.textPrimary,
    }).setOrigin(0.5);

    this._addSettingsButton();

    const cardsY = 40 + (height - 40) / 2 + 6;
    const gap = 40;
    const cardWidth = 270;
    this._addGameCard({ x: width / 2 - cardWidth / 2 - gap / 2, y: cardsY, title: 'TETRIS', accent: OkabeIto.skyBlue, game: GameId.TETRIS, scene: 'Tetris', drawIcon: this._drawTetrisIcon.bind(this) });
    this._addGameCard({ x: width / 2 + cardWidth / 2 + gap / 2, y: cardsY, title: 'ZUMA', accent: OkabeIto.reddishPurple, game: GameId.ZUMA, scene: 'Zuma', drawIcon: this._drawZumaIcon.bind(this) });
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

  _addGameCard({ x, y, title, accent, game, scene, drawIcon }) {
    const cardWidth = 270;
    const cardHeight = 220;

    const container = this.add.container(x, y);

    const g = this.add.graphics();
    g.fillStyle(hexToNum(AppColors.surface), 1);
    g.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 18);
    g.lineStyle(2, hexToNum(accent), 1);
    g.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 18);
    container.add(g);

    drawIcon(container, accent, -40);

    container.add(
      this.add.text(0, 20, title, { fontFamily: 'system-ui, sans-serif', fontSize: '24px', fontStyle: 'bold', color: AppColors.textPrimary }).setOrigin(0.5),
    );

    const highScore = getHighScore(game);
    const recordText = this.add
      .text(0, 52, `Recorde: ${highScore}`, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: AppColors.textSecondary })
      .setOrigin(0.5);
    container.add(recordText);
    container.recordText = recordText;

    container.setSize(cardWidth, cardHeight);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight),
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
}
