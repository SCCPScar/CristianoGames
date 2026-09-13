import { SevenBagRandomizer, Piece } from './tetromino.js';
import { Feedback } from '../../shared/feedback.js';
import { GameId, getHighScore, reportScore } from '../../shared/storage.js';

export const BOARD_ROWS = 20;
export const BOARD_COLS = 10;
const PREVIEW_COUNT = 3;
const LINES_PER_LEVEL = 10;
const WALL_KICKS = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]; // [dCol, dRow]

/// Owns all Tetris game state: board, falling piece, score, level, timing.
/// The scene only reads this and calls the move/rotate/drop/update methods
/// — no game logic lives in the rendering code.
export class TetrisGame {
  constructor() {
    this.bag = new SevenBagRandomizer();
    this.board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    this.queue = [];
    while (this.queue.length < PREVIEW_COUNT + 1) this.queue.push(this.bag.next());
    this.current = this._spawnPiece(this.queue.shift());
    this._refillQueue();

    this.score = 0;
    this.linesCleared = 0;
    this.level = 1;
    this.isGameOver = false;
    this.isPaused = false;
    this.isNewRecord = false;
    this.highScore = getHighScore(GameId.TETRIS);

    this._fallAccumulator = 0;
  }

  get nextPreview() {
    return this.queue.slice(0, PREVIEW_COUNT);
  }

  _refillQueue() {
    while (this.queue.length < PREVIEW_COUNT) this.queue.push(this.bag.next());
  }

  _spawnPiece(type) {
    const size = type === 'I' ? 4 : type === 'O' ? 2 : 3;
    const col = Math.floor((BOARD_COLS - size) / 2);
    return new Piece(type, 0, 0, col);
  }

  _canPlace(piece) {
    for (const [r, c] of piece.boardCells) {
      if (r < 0 || r >= BOARD_ROWS) return false;
      if (c < 0 || c >= BOARD_COLS) return false;
      if (this.board[r][c] !== null) return false;
    }
    return true;
  }

  _fallIntervalMs() {
    return Math.max(100, 800 - (this.level - 1) * 60);
  }

  /// Called every frame by the scene with the elapsed milliseconds.
  update(deltaMs) {
    if (this.isGameOver || this.isPaused) return;
    this._fallAccumulator += deltaMs;
    const interval = this._fallIntervalMs();
    while (this._fallAccumulator >= interval) {
      this._fallAccumulator -= interval;
      this._tick();
      if (this.isGameOver) break;
    }
  }

  _tick() {
    if (!this._tryMove(1, 0)) this._lockCurrentPiece();
  }

  _tryMove(dRow, dCol) {
    if (this.isGameOver || this.isPaused) return false;
    const moved = this.current.movedBy(dRow, dCol);
    if (this._canPlace(moved)) {
      this.current = moved;
      return true;
    }
    return false;
  }

  moveLeft() {
    this._tryMove(0, -1);
  }

  moveRight() {
    this._tryMove(0, 1);
  }

  softDrop() {
    if (!this._tryMove(1, 0)) this._lockCurrentPiece();
  }

  hardDrop() {
    if (this.isGameOver || this.isPaused) return;
    let piece = this.current;
    while (this._canPlace(piece.movedBy(1, 0))) piece = piece.movedBy(1, 0);
    this.current = piece;
    this._lockCurrentPiece();
  }

  rotate() {
    if (this.isGameOver || this.isPaused) return;
    const rotated = this.current.rotated();
    for (const [dCol, dRow] of WALL_KICKS) {
      const attempt = rotated.movedBy(dRow, dCol);
      if (this._canPlace(attempt)) {
        this.current = attempt;
        Feedback.tap();
        return;
      }
    }
  }

  /// Where the current piece would land if hard-dropped now, for the
  /// ghost-piece outline.
  get ghostPiece() {
    let piece = this.current;
    while (this._canPlace(piece.movedBy(1, 0))) piece = piece.movedBy(1, 0);
    return piece;
  }

  _lockCurrentPiece() {
    for (const [r, c] of this.current.boardCells) {
      if (r >= 0 && r < BOARD_ROWS) this.board[r][c] = this.current.type;
    }
    const cleared = this._clearFullLines();
    if (cleared > 0) {
      this._applyScoring(cleared);
      Feedback.success();
    }
    this._spawnNext();
  }

  _clearFullLines() {
    const fullRows = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (this.board[r].every((cell) => cell !== null)) fullRows.push(r);
    }
    for (const r of fullRows) {
      this.board.splice(r, 1);
      this.board.unshift(Array(BOARD_COLS).fill(null));
    }
    return fullRows.length;
  }

  _applyScoring(cleared) {
    const pointsPerClear = { 1: 100, 2: 300, 3: 500, 4: 800 };
    this.score += (pointsPerClear[cleared] || 800) * this.level;
    this.linesCleared += cleared;
    const newLevel = 1 + Math.floor(this.linesCleared / LINES_PER_LEVEL);
    if (newLevel !== this.level) {
      this.level = newLevel;
      this._fallAccumulator = 0;
    }
  }

  _spawnNext() {
    const type = this.queue.shift();
    this._refillQueue();
    const spawned = this._spawnPiece(type);
    this.current = spawned;
    if (!this._canPlace(spawned)) {
      this._endGame();
    }
  }

  _endGame() {
    this.isGameOver = true;
    this.isNewRecord = reportScore(GameId.TETRIS, this.score);
    this.highScore = getHighScore(GameId.TETRIS);
    Feedback.gameOver();
  }

  pause() {
    if (this.isGameOver || this.isPaused) return;
    this.isPaused = true;
  }

  resume() {
    if (this.isGameOver || !this.isPaused) return;
    this.isPaused = false;
  }

  reset() {
    this.bag = new SevenBagRandomizer();
    this.board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    this.queue = [];
    while (this.queue.length < PREVIEW_COUNT + 1) this.queue.push(this.bag.next());
    this.current = this._spawnPiece(this.queue.shift());
    this._refillQueue();
    this.score = 0;
    this.linesCleared = 0;
    this.level = 1;
    this.isGameOver = false;
    this.isPaused = false;
    this.isNewRecord = false;
    this._fallAccumulator = 0;
  }
}
