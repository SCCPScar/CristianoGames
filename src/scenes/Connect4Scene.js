import Phaser from 'phaser';
import { Connect4Game, Connect4Piece, ROWS, COLS } from '../games/connect4/connect4Game.js';
import { AppColors, OkabeIto, hexToNum } from '../shared/theme.js';
import { showGameOverDialog } from '../shared/dialogs.js';
import { getSafeAreaInsets } from '../shared/safeArea.js';
import { setOrientation } from '../shared/orientation.js';

const PLAYER_COLOR = OkabeIto.skyBlue;
const AI_COLOR = OkabeIto.vermillion;
const AI_THINK_MS = 550;

/// Player vs. a simple AI (win-now → block → prefer-center heuristic —
/// see Connect4Game.pickAiColumn). Turn-based, so unlike Tetris/Zuma this
/// scene has no update() loop: the board is redrawn once per move
/// instead of every frame.
export class Connect4Scene extends Phaser.Scene {
  constructor() {
    super('Connect4');
  }

  create() {
    setOrientation(this, 'landscape');
    this.game_ = new Connect4Game();
    this._dialogOpen = false;
    this.safeArea = getSafeAreaInsets(this);

    this.cameras.main.setBackgroundColor(AppColors.background);
    this._computeLayout();
    this._buildHud();
    this._buildColumnInput();

    this._boardLayer = this.add.graphics();
    this._redraw();
  }

  _computeLayout() {
    const { width, height } = this.scale;
    const safe = this.safeArea;
    const top = 66 + safe.top;
    const bottom = 24 + safe.bottom;
    const availH = height - top - bottom;
    const availW = width - 40 - safe.left - safe.right;
    this.cell = Math.min(availW / COLS, availH / ROWS, 66);
    this.boardW = this.cell * COLS;
    this.boardH = this.cell * ROWS;
    this.boardX = safe.left + (width - safe.left - safe.right - this.boardW) / 2;
    this.boardY = top + Math.max(0, (availH - this.boardH) / 2);
  }

  _buildHud() {
    const { width } = this.scale;
    const safe = this.safeArea;

    this.add
      .text(20 + safe.left, 16 + safe.top, '←', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', color: AppColors.textPrimary })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('Home'));

    this.turnText = this.add
      .text(width / 2, 18 + safe.top, '', { fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold', color: AppColors.textPrimary })
      .setOrigin(0.5, 0);

    this.legendText = this.add
      .text(width - 20 - safe.right, 16 + safe.top, '', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: AppColors.textSecondary, align: 'right' })
      .setOrigin(1, 0);
  }

  _buildColumnInput() {
    const { height } = this.scale;
    this._columnZones = [];
    for (let c = 0; c < COLS; c++) {
      const x = this.boardX + c * this.cell;
      const zone = this.add
        .zone(x, 0, this.cell, height)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this._onColumnTap(c));
      this._columnZones.push(zone);
    }
  }

  _onColumnTap(col) {
    if (this._dialogOpen || this.game_.isMatchOver || this.game_.turn !== Connect4Piece.PLAYER) return;
    const result = this.game_.dropPiece(col);
    if (!result) return; // column full
    this._redraw();
    this._afterMove();
  }

  _afterMove() {
    if (this.game_.isMatchOver) {
      this._showResult();
      return;
    }
    if (this.game_.turn === Connect4Piece.AI) {
      this.time.delayedCall(AI_THINK_MS, () => {
        if (this.game_.isMatchOver) return;
        const col = this.game_.pickAiColumn();
        this.game_.dropPiece(col);
        this._redraw();
        this._afterMove();
      });
    }
  }

  _showResult() {
    this._dialogOpen = true;
    const g = this.game_;
    const outcomes = {
      player: { title: 'Você venceu!', titleIcon: '🏆', titleColor: OkabeIto.yellow },
      draw: { title: 'Empate', titleIcon: '🤝', titleColor: AppColors.textSecondary },
      ai: { title: 'O computador venceu', titleIcon: '😕', titleColor: AppColors.danger },
    };
    const key = g.winner === Connect4Piece.PLAYER ? 'player' : g.winner === Connect4Piece.AI ? 'ai' : 'draw';
    showGameOverDialog(this, {
      ...outcomes[key],
      score: g.score,
      bestScore: g.highScore,
      isNewRecord: g.isNewRecord,
      onPlayAgain: () => {
        this._dialogOpen = false;
        this.game_.reset();
        this._redraw();
      },
      onMenu: () => {
        this._dialogOpen = false;
        this.scene.start('Home');
      },
    });
  }

  _updateHud() {
    const g = this.game_;
    if (g.isMatchOver) {
      this.turnText.setText('Partida encerrada');
    } else {
      this.turnText.setText(g.turn === Connect4Piece.PLAYER ? 'Sua vez' : 'Vez do computador...');
    }
    this.legendText.setText('Você: ●  ·  PC: ✕');
  }

  _redraw() {
    this._updateHud();
    const g = this._boardLayer;
    g.clear();
    const { boardX: x, boardY: y, boardW: w, boardH: h, cell } = this;
    const r = cell * 0.36;

    g.fillStyle(hexToNum(AppColors.surfaceHigh), 1);
    g.fillRoundedRect(x - 10, y - 10, w + 20, h + 20, 14);

    const winSet = new Set(this.game_.winningCells.map(([r_, c_]) => `${r_},${c_}`));

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = x + col * cell + cell / 2;
        const cy = y + row * cell + cell / 2;
        const piece = this.game_.board[row][col];

        if (!piece) {
          g.fillStyle(hexToNum(AppColors.background), 1);
          g.fillCircle(cx, cy, r);
          continue;
        }

        const isWinning = winSet.has(`${row},${col}`);
        const color = piece === Connect4Piece.PLAYER ? PLAYER_COLOR : AI_COLOR;
        g.fillStyle(hexToNum(color), 1);
        g.fillCircle(cx, cy, r);
        if (isWinning) {
          g.lineStyle(3, hexToNum(OkabeIto.yellow), 1);
          g.strokeCircle(cx, cy, r + 2);
        }

        // Shape redundancy on top of color: a ring for the player's
        // piece, an X for the AI's — never rely on color alone.
        if (piece === Connect4Piece.PLAYER) {
          g.lineStyle(Math.max(2, r * 0.24), hexToNum(AppColors.background), 1);
          g.strokeCircle(cx, cy, r * 0.5);
        } else {
          g.lineStyle(Math.max(2, r * 0.22), hexToNum(AppColors.background), 1);
          const d = r * 0.42;
          g.beginPath();
          g.moveTo(cx - d, cy - d);
          g.lineTo(cx + d, cy + d);
          g.moveTo(cx + d, cy - d);
          g.lineTo(cx - d, cy + d);
          g.strokePath();
        }
      }
    }
  }
}
