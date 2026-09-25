import { GameId, getHighScore, reportScore } from '../../shared/storage.js';
import { Feedback } from '../../shared/feedback.js';

export const ROWS = 6;
export const COLS = 7;

export const Connect4Piece = { PLAYER: 'player', AI: 'ai' };

const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal ↘
  [1, -1], // diagonal ↙
];

/// Owns board state, turn order and the AI opponent for one match. The
/// scene only reads this and calls dropPiece()/reset() — no rendering or
/// input logic lives here, same split as TetrisGame/ZumaGame.
export class Connect4Game {
  constructor() {
    this._newBoard();
  }

  _newBoard() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.turn = Connect4Piece.PLAYER;
    this.winner = null; // null | Connect4Piece.PLAYER | Connect4Piece.AI | 'draw'
    this.winningCells = [];
    this.movesPlayed = 0;
    this.lastDrop = null;
    this.isMatchOver = false;
    this.score = 0;
    this.isNewRecord = false;
    this.highScore = getHighScore(GameId.CONNECT4);
  }

  /// Drops [piece] into [col] (lowest empty row). Returns the landed
  /// {row, col}, or null if the column is full or the match already
  /// ended. Resolves the winner check and, when it's still the player's
  /// turn afterward, hands off to _aiMove() on a short delay the scene
  /// can await via aiThinking.
  dropPiece(col) {
    if (this.isMatchOver) return null;
    const row = this._lowestEmptyRow(col);
    if (row === null) return null;

    this.board[row][col] = this.turn;
    this.movesPlayed++;
    this.lastDrop = { row, col };

    const win = this._checkWinFrom(row, col);
    if (win) {
      this._endMatch(this.turn, win);
    } else if (this.movesPlayed >= ROWS * COLS) {
      this._endMatch('draw', []);
    } else {
      this.turn = this.turn === Connect4Piece.PLAYER ? Connect4Piece.AI : Connect4Piece.PLAYER;
    }
    return { row, col };
  }

  _lowestEmptyRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r][col] === null) return r;
    }
    return null;
  }

  _checkWinFrom(row, col) {
    const piece = this.board[row][col];
    for (const [dr, dc] of DIRECTIONS) {
      const line = [[row, col]];
      for (const sign of [1, -1]) {
        let r = row + dr * sign, c = col + dc * sign;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && this.board[r][c] === piece) {
          line.push([r, c]);
          r += dr * sign;
          c += dc * sign;
        }
      }
      if (line.length >= 4) return line;
    }
    return null;
  }

  _endMatch(winner, winningCells) {
    this.winner = winner;
    this.winningCells = winningCells;
    this.isMatchOver = true;
    if (winner === Connect4Piece.PLAYER) {
      // Faster wins score higher, but a slow win is still a solid score
      // — never worth less than a draw.
      this.score = Math.max(60, 160 - this.movesPlayed * 3);
      this.isNewRecord = reportScore(GameId.CONNECT4, this.score);
      this.highScore = getHighScore(GameId.CONNECT4);
      Feedback.celebrate();
    } else if (winner === 'draw') {
      this.score = 20;
      Feedback.tap();
    } else {
      this.score = 0;
      Feedback.gameOver();
    }
  }

  /// Picks the AI's column: win now if possible, else block the
  /// player's winning move, else prefer the center (statistically the
  /// strongest opening/mid-game columns in Connect Four), with a little
  /// randomness so it isn't perfectly predictable.
  pickAiColumn() {
    const openCols = [];
    for (let c = 0; c < COLS; c++) if (this._lowestEmptyRow(c) !== null) openCols.push(c);

    const winningCol = openCols.find((c) => this._wouldWin(c, Connect4Piece.AI));
    if (winningCol !== undefined) return winningCol;

    const blockingCol = openCols.find((c) => this._wouldWin(c, Connect4Piece.PLAYER));
    if (blockingCol !== undefined) return blockingCol;

    const centerOrder = [3, 2, 4, 1, 5, 0, 6].filter((c) => openCols.includes(c));
    const topChoices = centerOrder.slice(0, 3);
    return topChoices[Math.floor(Math.random() * topChoices.length)];
  }

  _wouldWin(col, piece) {
    const row = this._lowestEmptyRow(col);
    if (row === null) return false;
    this.board[row][col] = piece;
    const win = this._checkWinFrom(row, col);
    this.board[row][col] = null;
    return win !== null;
  }

  reset() {
    this._newBoard();
  }
}
