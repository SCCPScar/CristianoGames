import Phaser from 'phaser';
import { SequenceGame, Pads } from '../games/sequence/sequenceGame.js';
import { AppColors, hexToNum } from '../shared/theme.js';
import { Feedback } from '../shared/feedback.js';
import { showGameOverDialog } from '../shared/dialogs.js';
import { getSafeAreaInsets } from '../shared/safeArea.js';
import { setOrientation } from '../shared/orientation.js';

const FLASH_MS = 380;
const STEP_GAP_MS = 260;
const FIRST_STEP_DELAY_MS = 500;

/// Simon/Genius-style growing sequence. Each of the 4 pads carries
/// color + shape + a distinct tone (see Pads in sequenceGame.js), so the
/// sequence is followable through any one of those channels alone.
export class SequenceScene extends Phaser.Scene {
  constructor() {
    super('Sequence');
  }

  create() {
    setOrientation(this, 'landscape');
    this.game_ = new SequenceGame();
    this._dialogOpen = false;
    this.safeArea = getSafeAreaInsets(this);

    this.cameras.main.setBackgroundColor(AppColors.background);
    this._buildHud();
    this._buildPads();
    this._updateHud();

    this._playSequence();
  }

  _buildHud() {
    const { width } = this.scale;
    const safe = this.safeArea;

    this.add
      .text(20 + safe.left, 16 + safe.top, '←', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: AppColors.textPrimary })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Home'));

    this.statusText = this.add
      .text(width / 2, 14 + safe.top, '', { fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: AppColors.textPrimary })
      .setOrigin(0.5, 0);
    this.roundText = this.add
      .text(width / 2, 36 + safe.top, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: AppColors.textSecondary })
      .setOrigin(0.5, 0);

    this.recordText = this.add
      .text(width - 20 - safe.right, 16 + safe.top, `Recorde: ${this.game_.highScore}`, { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: AppColors.textSecondary })
      .setOrigin(1, 0);
  }

  _buildPads() {
    const { width, height } = this.scale;
    const safe = this.safeArea;
    const centerX = width / 2;
    const centerY = safe.top + 70 + (height - safe.top - safe.bottom - 70) / 2;
    const padSize = Math.min(150, (height - safe.top - safe.bottom - 100) / 2 - 8);
    const gap = 14;

    const positions = [
      { x: centerX - padSize / 2 - gap / 2, y: centerY - padSize / 2 - gap / 2 },
      { x: centerX + padSize / 2 + gap / 2, y: centerY - padSize / 2 - gap / 2 },
      { x: centerX - padSize / 2 - gap / 2, y: centerY + padSize / 2 + gap / 2 },
      { x: centerX + padSize / 2 + gap / 2, y: centerY + padSize / 2 + gap / 2 },
    ];

    this.pads = Pads.map((def, i) => {
      const { x, y } = positions[i];
      const bg = this.add
        .rectangle(x, y, padSize, padSize, hexToNum(def.color), 1)
        .setStrokeStyle(2, hexToNum(AppColors.background), 0.5)
        .setAlpha(0.5)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => this._onPadTap(i));

      const icon = this.add.graphics();
      this._drawShape(icon, def.icon, x, y, padSize * 0.2);

      return { bg, icon, x, y };
    });
  }

  _drawShape(g, shape, cx, cy, size) {
    g.fillStyle(0xffffff, 0.92);
    switch (shape) {
      case 'triangle':
        g.fillTriangle(cx, cy - size, cx - size, cy + size * 0.8, cx + size, cy + size * 0.8);
        break;
      case 'square':
        g.fillRect(cx - size * 0.85, cy - size * 0.85, size * 1.7, size * 1.7);
        break;
      case 'circle':
        g.fillCircle(cx, cy, size);
        break;
      case 'star': {
        const points = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? size * 1.15 : size * 0.45;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
        }
        g.fillPoints(points, true);
        break;
      }
      default:
        break;
    }
  }

  _flashPad(index) {
    const pad = this.pads[index];
    pad.bg.setAlpha(1);
    Feedback.tone(Pads[index].freq);
    this.time.delayedCall(FLASH_MS * 0.7, () => pad.bg.setAlpha(0.5));
  }

  _playSequence() {
    this._updateHud();
    let i = 0;
    const step = () => {
      if (this.game_.isGameOver) return;
      if (i >= this.game_.sequence.length) {
        this.game_.beginInput();
        this._updateHud();
        return;
      }
      this._flashPad(this.game_.sequence[i]);
      i++;
      this.time.delayedCall(FLASH_MS + STEP_GAP_MS, step);
    };
    this.time.delayedCall(FIRST_STEP_DELAY_MS, step);
  }

  _onPadTap(index) {
    if (this._dialogOpen || this.game_.state !== 'input') return;
    this._flashPad(index);
    const result = this.game_.submitTap(index);
    if (result === 'wrong') {
      this._showResult();
    } else if (result === 'round-complete') {
      this.time.delayedCall(FLASH_MS + 300, () => this._playSequence());
    }
  }

  _updateHud() {
    const g = this.game_;
    if (g.isGameOver) {
      this.statusText.setText('Fim de jogo');
    } else if (g.state === 'showing') {
      this.statusText.setText('Observe a sequência...');
    } else {
      this.statusText.setText('Sua vez — repita a sequência');
    }
    this.roundText.setText(`Rodada ${g.round}`);
    this.recordText.setText(`Recorde: ${g.highScore}`);
  }

  _showResult() {
    this._dialogOpen = true;
    const g = this.game_;
    showGameOverDialog(this, {
      title: 'Fim de jogo',
      titleIcon: '😕',
      titleColor: AppColors.danger,
      score: g.score,
      bestScore: g.highScore,
      isNewRecord: g.isNewRecord,
      onPlayAgain: () => {
        this._dialogOpen = false;
        this.game_.reset();
        this._playSequence();
      },
      onMenu: () => {
        this._dialogOpen = false;
        this.scene.start('Home');
      },
    });
  }
}
