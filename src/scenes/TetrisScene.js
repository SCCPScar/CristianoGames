import Phaser from 'phaser';
import { TetrisGame, BOARD_ROWS, BOARD_COLS } from '../games/tetris/tetrisGame.js';
import { AppColors, tetrominoStyles, hexToNum, lerpColorNum, legibleForegroundOn } from '../shared/theme.js';
import { showPauseDialog, showGameOverDialog } from '../shared/dialogs.js';

export class TetrisScene extends Phaser.Scene {
  constructor() {
    super('Tetris');
  }

  create() {
    this.game_ = new TetrisGame();
    this._dialogOpen = false;
    this._dragDx = 0;
    this._dragDy = 0;

    const { width } = this.scale;
    this.cameras.main.setBackgroundColor(AppColors.background);

    this.add
      .text(20, 20, '←', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: AppColors.textPrimary })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Home'));

    this.hudText = this.add.text(width / 2, 24, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: AppColors.textPrimary,
    }).setOrigin(0.5);

    this.add
      .text(width - 24, 20, '⏸', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: AppColors.textPrimary })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._openPauseMenu());

    this.previewLabel = this.add.text(width / 2, 60, '', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: AppColors.textSecondary }).setOrigin(0.5);
    this.previewGraphics = this.add.graphics();
    this.previewTexts = [];

    this._computeLayout();

    this.boardGraphics = this.add.graphics();
    this.pieceGraphics = this.add.graphics();

    this.boardTexts = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const t = this.add
          .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: `${Math.floor(this.cellSize * 0.48)}px`, fontStyle: 'bold' })
          .setOrigin(0.5)
          .setVisible(false);
        this.boardTexts[r][c] = t;
      }
    }
    this.pieceTexts = [0, 1, 2, 3].map(() =>
      this.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: `${Math.floor(this.cellSize * 0.48)}px`, fontStyle: 'bold' }).setOrigin(0.5),
    );

    this._addBoardInput();
    this._addControls();
    this._syncBoardText();
    this._updateHud();
  }

  _computeLayout() {
    const { width, height } = this.scale;
    const top = 96;
    const bottom = 130;
    const availWidth = width - 40;
    const availHeight = height - top - bottom;
    this.cellSize = Math.min(availWidth / BOARD_COLS, availHeight / BOARD_ROWS);
    this.boardWidth = this.cellSize * BOARD_COLS;
    this.boardHeight = this.cellSize * BOARD_ROWS;
    this.boardX = (width - this.boardWidth) / 2;
    this.boardY = top;
  }

  _addBoardInput() {
    const zone = this.add
      .zone(this.boardX, this.boardY, this.boardWidth, this.boardHeight)
      .setOrigin(0)
      .setInteractive();

    let dragging = false;
    zone.on('pointerdown', () => {
      dragging = true;
      this._dragDx = 0;
      this._dragDy = 0;
    });
    zone.on('pointermove', (pointer) => {
      if (!dragging || !pointer.isDown) return;
      this._handleDrag(pointer);
    });
    zone.on('pointerup', (pointer) => {
      dragging = false;
      const totalMove = Math.abs(pointer.downX - pointer.upX) + Math.abs(pointer.downY - pointer.upY);
      const velY = pointer.velocity ? pointer.velocity.y : 0;
      if (totalMove < 20) {
        this.game_.rotate();
      } else if (velY > 900) {
        this.game_.hardDrop();
        this._syncBoardText();
      }
      this._dragDx = 0;
      this._dragDy = 0;
    });
  }

  _handleDrag(pointer) {
    const step = this.cellSize;
    this._dragDx += pointer.x - pointer.prevPosition.x;
    this._dragDy += pointer.y - pointer.prevPosition.y;
    while (Math.abs(this._dragDx) >= step) {
      if (this._dragDx > 0) {
        this.game_.moveRight();
        this._dragDx -= step;
      } else {
        this.game_.moveLeft();
        this._dragDx += step;
      }
    }
    while (this._dragDy >= step) {
      this.game_.softDrop();
      this._dragDy -= step;
      this._syncBoardText();
    }
  }

  _addControls() {
    const { width, height } = this.scale;
    const y = height - 55;
    const spacing = width / 5;
    const labels = [
      { icon: '←', action: () => this.game_.moveLeft() },
      { icon: '⟳', action: () => this.game_.rotate() },
      { icon: '→', action: () => this.game_.moveRight() },
      { icon: '↓', action: () => { this.game_.softDrop(); this._syncBoardText(); } },
      { icon: '⇊', action: () => { this.game_.hardDrop(); this._syncBoardText(); } },
    ];
    labels.forEach((entry, i) => {
      const x = spacing * i + spacing / 2;
      const bg = this.add.circle(x, y, 28, hexToNum(AppColors.surface)).setInteractive({ useHandCursor: true });
      this.add.text(x, y, entry.icon, { fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: AppColors.textPrimary }).setOrigin(0.5);
      bg.on('pointerdown', () => bg.setScale(0.9));
      bg.on('pointerup', () => {
        bg.setScale(1);
        entry.action();
      });
      bg.on('pointerout', () => bg.setScale(1));
    });
  }

  _updateHud() {
    this.hudText.setText(`Pontos: ${this.game_.score} · Nível: ${this.game_.level}`);

    this.previewGraphics.clear();
    this.previewTexts.forEach((t) => t.destroy());
    this.previewTexts = [];
    const preview = this.game_.nextPreview;
    const size = 26;
    const gap = 8;
    this.previewLabel.setText('Próximas:').setPosition(16, 60).setOrigin(0, 0.5);
    const startX = 16 + this.previewLabel.width + 10;
    preview.forEach((type, i) => {
      const style = tetrominoStyles[type];
      const x = startX + i * (size + gap);
      this.previewGraphics.fillStyle(hexToNum(style.color), 1);
      this.previewGraphics.fillRoundedRect(x, 60 - size / 2, size, size, 6);
      const t = this.add
        .text(x + size / 2, 60, style.letter, { fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: legibleForegroundOn(style.color) })
        .setOrigin(0.5);
      this.previewTexts.push(t);
    });
  }

  _cellRect(r, c) {
    return {
      x: this.boardX + c * this.cellSize,
      y: this.boardY + r * this.cellSize,
      size: this.cellSize,
    };
  }

  _drawBlock(g, x, y, size, colorHex, inset = 1) {
    const bx = x + inset, by = y + inset, bw = size - inset * 2, bh = size - inset * 2;
    const bevel = bw * 0.16;
    const colorNum = hexToNum(colorHex);
    const light = lerpColorNum(colorNum, 0xffffff, 0.45);
    const dark = lerpColorNum(colorNum, 0x000000, 0.45);

    g.fillStyle(colorNum, 1);
    g.fillRect(bx, by, bw, bh);

    g.fillStyle(light, 0.8);
    g.fillPoints([{ x: bx, y: by }, { x: bx + bw, y: by }, { x: bx + bw - bevel, y: by + bevel }, { x: bx + bevel, y: by + bevel }], true);
    g.fillStyle(light, 0.5);
    g.fillPoints([{ x: bx, y: by }, { x: bx + bevel, y: by + bevel }, { x: bx + bevel, y: by + bh - bevel }, { x: bx, y: by + bh }], true);
    g.fillStyle(dark, 0.5);
    g.fillPoints([{ x: bx, y: by + bh }, { x: bx + bevel, y: by + bh - bevel }, { x: bx + bw - bevel, y: by + bh - bevel }, { x: bx + bw, y: by + bh }], true);
    g.fillStyle(dark, 0.65);
    g.fillPoints([{ x: bx + bw, y: by }, { x: bx + bw - bevel, y: by + bevel }, { x: bx + bw - bevel, y: by + bh - bevel }, { x: bx + bw, y: by + bh }], true);
  }

  _syncBoardText() {
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const type = this.game_.board[r][c];
        const t = this.boardTexts[r][c];
        if (type) {
          const style = tetrominoStyles[type];
          const { x, y, size } = this._cellRect(r, c);
          t.setText(style.letter).setPosition(x + size / 2, y + size / 2).setColor(legibleForegroundOn(style.color)).setVisible(true);
        } else {
          t.setVisible(false);
        }
      }
    }
    this._updateHud();
  }

  update(time, delta) {
    if (!this.game_ || this._dialogOpen) return;
    const wasGameOver = this.game_.isGameOver;
    this.game_.update(delta);
    if (!wasGameOver && this.game_.isGameOver) {
      this._syncBoardText();
      this._showGameOver();
      return;
    }

    // Redraw locked board every frame is wasted work; only line-clear/lock
    // events change it, and those already call _syncBoardText(). We still
    // need to repaint the Graphics layer each frame since it was cleared.
    this.boardGraphics.clear();
    const gridColor = hexToNum(AppColors.surfaceHigh);
    this.boardGraphics.lineStyle(1, gridColor, 1);
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const { x, y, size } = this._cellRect(r, c);
        this.boardGraphics.strokeRect(x, y, size, size);
        const type = this.game_.board[r][c];
        if (type) {
          this._drawBlock(this.boardGraphics, x, y, size, tetrominoStyles[type].color);
        }
      }
    }

    this.pieceGraphics.clear();
    const ghost = this.game_.ghostPiece;
    const ghostColorNum = hexToNum(tetrominoStyles[this.game_.current.type].color);
    for (const [r, c] of ghost.boardCells) {
      if (r < 0) continue;
      const { x, y, size } = this._cellRect(r, c);
      this.pieceGraphics.lineStyle(2, ghostColorNum, 0.5);
      this.pieceGraphics.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
    }

    const currentCells = this.game_.current.boardCells;
    const style = tetrominoStyles[this.game_.current.type];
    currentCells.forEach(([r, c], i) => {
      const text = this.pieceTexts[i];
      if (r < 0) {
        text.setVisible(false);
        return;
      }
      const { x, y, size } = this._cellRect(r, c);
      this._drawBlock(this.pieceGraphics, x, y, size, style.color);
      text.setText(style.letter).setPosition(x + size / 2, y + size / 2).setColor(legibleForegroundOn(style.color)).setVisible(true);
    });

    this.hudText.setText(`Pontos: ${this.game_.score} · Nível: ${this.game_.level}`);
  }

  _openPauseMenu() {
    if (this.game_.isGameOver || this.game_.isPaused || this._dialogOpen) return;
    this.game_.pause();
    this._dialogOpen = true;
    showPauseDialog(this, {
      onResume: () => {
        this._dialogOpen = false;
        this.game_.resume();
      },
      onExit: () => {
        this._dialogOpen = false;
        this.scene.start('Home');
      },
    });
  }

  _showGameOver() {
    this._dialogOpen = true;
    showGameOverDialog(this, {
      score: this.game_.score,
      bestScore: this.game_.highScore,
      isNewRecord: this.game_.isNewRecord,
      onPlayAgain: () => {
        this._dialogOpen = false;
        this.game_.reset();
        this._syncBoardText();
      },
      onMenu: () => {
        this._dialogOpen = false;
        this.scene.start('Home');
      },
    });
  }
}
