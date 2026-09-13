import Phaser from 'phaser';
import { AppColors, OkabeIto, hexToNum } from '../shared/theme.js';
import { GameId, getHighScore, getSoundEnabled, setSoundEnabled, getHapticsEnabled, setHapticsEnabled } from '../shared/storage.js';
import { makeButton, showModal } from '../shared/ui.js';

/// Home screen: app title, settings gear, and two large, shape-distinct
/// cards to pick a game. Icons differ in silhouette (not just color) so
/// they stay distinguishable in grayscale.
export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create() {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor(AppColors.background);

    this.add.text(width / 2, 56, 'Arcade do Pai', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: AppColors.textPrimary,
    }).setOrigin(0.5);

    this._addSettingsButton();
    this._addGameCard({ y: 340, title: 'TETRIS', accent: OkabeIto.skyBlue, game: GameId.TETRIS, scene: 'Tetris', drawIcon: this._drawTetrisIcon.bind(this) });
    this._addGameCard({ y: 520, title: 'ZUMA', accent: OkabeIto.reddishPurple, game: GameId.ZUMA, scene: 'Zuma', drawIcon: this._drawZumaIcon.bind(this) });
  }

  _addSettingsButton() {
    const { width } = this.scale;
    const btn = this.add.circle(width - 40, 56, 22, hexToNum(AppColors.surface)).setInteractive({ useHandCursor: true });
    this.add.text(width - 40, 56, '⚙', { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: AppColors.textPrimary }).setOrigin(0.5);
    btn.on('pointerup', () => this._openSettings());
  }

  /// Redraws the whole dialog on every toggle — simpler than patching
  /// individual buttons in place, and this dialog is cheap to rebuild.
  _openSettings() {
    const { panel, close } = showModal(this, { panelWidth: 280, panelHeight: 230 });

    panel.add(
      this.add.text(0, -85, '⚙  Configurações', { fontFamily: 'system-ui, sans-serif', fontSize: '19px', fontStyle: 'bold', color: AppColors.textPrimary }).setOrigin(0.5),
    );

    const soundOn = getSoundEnabled();
    panel.add(
      makeButton(this, {
        x: 0,
        y: -15,
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
    panel.add(
      makeButton(this, {
        x: 0,
        y: 50,
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

    panel.add(
      makeButton(this, {
        x: 0,
        y: 105,
        width: 160,
        height: 44,
        label: 'Fechar',
        filled: false,
        bgColor: AppColors.textSecondary,
        onClick: close,
      }),
    );
  }

  _addGameCard({ y, title, accent, game, scene, drawIcon }) {
    const { width } = this.scale;
    const cardWidth = 260;
    const cardHeight = 150;

    const container = this.add.container(width / 2, y);

    const g = this.add.graphics();
    g.fillStyle(hexToNum(AppColors.surface), 1);
    g.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 18);
    g.lineStyle(2, hexToNum(accent), 1);
    g.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 18);
    container.add(g);

    drawIcon(container, accent);

    container.add(
      this.add.text(0, 28, title, { fontFamily: 'system-ui, sans-serif', fontSize: '24px', fontStyle: 'bold', color: AppColors.textPrimary }).setOrigin(0.5),
    );

    const highScore = getHighScore(game);
    const recordText = this.add
      .text(0, 56, `Recorde: ${highScore}`, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: AppColors.textSecondary })
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
  }

  _drawTetrisIcon(container, accent) {
    const g = this.add.graphics();
    g.fillStyle(hexToNum(accent), 1);
    const barWidth = 14;
    const gap = 8;
    const heights = [26, 42, 34];
    heights.forEach((h, i) => {
      const x = (i - 1) * (barWidth + gap);
      g.fillRoundedRect(x - barWidth / 2, -30 - h / 2 + 30, barWidth, h, 3);
    });
    container.add(g);
  }

  _drawZumaIcon(container, accent) {
    const g = this.add.graphics();
    g.fillStyle(hexToNum(accent), 1);
    const radii = [8, 10, 10, 8];
    let x = -36;
    for (const r of radii) {
      g.fillCircle(x, -5, r);
      x += r * 2 + 4;
    }
    container.add(g);
  }
}
