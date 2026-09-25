import { GameId, getHighScore, reportScore } from '../../shared/storage.js';
import { Feedback } from '../../shared/feedback.js';
import { OkabeIto } from '../../shared/theme.js';

export const PAD_COUNT = 4;

/// Each pad pairs a color with a shape AND a distinct tone — three
/// independent channels so the sequence is followable by color, by
/// silhouette, or by ear alone.
export const Pads = [
  { color: OkabeIto.skyBlue, icon: 'triangle', freq: 392 }, // G4
  { color: OkabeIto.vermillion, icon: 'square', freq: 330 }, // E4
  { color: OkabeIto.yellow, icon: 'star', freq: 494 }, // B4
  { color: OkabeIto.bluishGreen, icon: 'circle', freq: 262 }, // C4
];

/// Classic "Simon" growing-sequence game: owns the sequence, the
/// player's progress through it, and scoring. The scene drives the
/// playback animation and reads `state` to know when input is allowed.
export class SequenceGame {
  constructor() {
    this.sequence = [];
    this.playerIndex = 0;
    this.score = 0;
    this.isGameOver = false;
    this.isNewRecord = false;
    this.highScore = getHighScore(GameId.SEQUENCE);
    this.state = 'idle'; // idle | showing | input | gameover
    this._addStep();
  }

  get round() {
    return this.sequence.length;
  }

  _addStep() {
    this.sequence.push(Math.floor(Math.random() * PAD_COUNT));
    this.playerIndex = 0;
  }

  /// Scene calls this once it's done animating the current sequence
  /// playback, to unlock player input.
  beginInput() {
    if (!this.isGameOver) this.state = 'input';
  }

  /// Player tapped pad [index]. Returns 'correct' (mid-sequence, more to
  /// go), 'round-complete' (sequence finished, a new step was just
  /// appended — scene should replay it), or 'wrong' (game over).
  submitTap(index) {
    if (this.state !== 'input' || this.isGameOver) return null;
    const expected = this.sequence[this.playerIndex];
    if (index !== expected) {
      this._endGame();
      return 'wrong';
    }
    this.playerIndex++;
    if (this.playerIndex >= this.sequence.length) {
      this.score = this.sequence.length * 10;
      Feedback.success();
      this._addStep();
      this.state = 'showing';
      return 'round-complete';
    }
    return 'correct';
  }

  _endGame() {
    this.isGameOver = true;
    this.state = 'gameover';
    // The round that was in progress when the player slipped doesn't
    // count — only the ones fully completed before it.
    this.score = Math.max(0, this.sequence.length - 1) * 10;
    this.isNewRecord = reportScore(GameId.SEQUENCE, this.score);
    this.highScore = getHighScore(GameId.SEQUENCE);
    Feedback.gameOver();
  }

  reset() {
    this.sequence = [];
    this.playerIndex = 0;
    this.score = 0;
    this.isGameOver = false;
    this.isNewRecord = false;
    this.state = 'idle';
    this._addStep();
  }
}
