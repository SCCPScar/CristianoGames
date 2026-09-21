import { GamePath } from './path.js';
import { BALL_TYPES } from '../../shared/theme.js';
import { Feedback } from '../../shared/feedback.js';
import { GameId, getHighScore, reportScore } from '../../shared/storage.js';

export const ZUMA_LEVELS = [
  { ballCount: 10, speed: 0.045 },
  { ballCount: 13, speed: 0.050 },
  { ballCount: 16, speed: 0.055 },
  { ballCount: 19, speed: 0.060 },
  { ballCount: 22, speed: 0.065 },
];

const PROJECTILE_SPEED = 1100.0; // pixels/sec
const POPUP_LIFETIME = 0.9; // seconds

function randomBallType() {
  return BALL_TYPES[Math.floor(Math.random() * BALL_TYPES.length)];
}

/// Owns all Zuma game state: the ball chain, the shooter, projectiles,
/// scoring, levels and timing. The scene only reads this and calls
/// fire()/pause()/resume()/nextLevel()/reset()/update().
export class ZumaGame {
  constructor() {
    this.path = new GamePath();
    this.chain = [];
    this.projectiles = [];
    this.popups = [];
    // Transient one-shot visual events for the scene to consume: matched
    // balls (for burst/particle effects) and projectile impacts (for a
    // small hit flash). The scene drains these every frame; the model
    // never reads them back, so it stays render-agnostic.
    this._matchBursts = [];
    this._impactFlashes = [];

    this.boardWidth = 0;
    this.boardHeight = 0;
    this.levelIndex = 0;
    this.score = 0;
    this.highScore = getHighScore(GameId.ZUMA);
    this.isPaused = false;
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.isVictory = false;
    this.isNewRecord = false;

    this.currentBall = randomBallType();
    this.nextBall = randomBallType();
    // _setupLevel() runs once the board's real pixel size is known (see
    // setBoardSize) — ball spacing depends on ballRadius, which depends
    // on board size, so setting the chain up any earlier would place
    // balls using a meaningless fallback radius.
  }

  get levelNumber() {
    return this.levelIndex + 1;
  }

  get totalLevels() {
    return ZUMA_LEVELS.length;
  }

  get ballRadius() {
    if (!this.boardWidth) return 16;
    return Math.max(12, Math.min(20, Math.min(this.boardWidth, this.boardHeight) * 0.045));
  }

  /// Real pixel gap (center-to-center) between chained balls — tied to
  /// the rendered ball size so they read as evenly spaced everywhere
  /// along the path, regardless of board aspect ratio.
  get _ballSpacing() {
    return this.ballRadius * 2.05;
  }

  get shooterPosition() {
    return { x: this.boardWidth * this.path.center.x, y: this.boardHeight * this.path.center.y };
  }

  /// Fraction (0..1) of this level's balls already cleared, for a HUD
  /// progress bar.
  get levelProgress() {
    const total = ZUMA_LEVELS[this.levelIndex].ballCount;
    if (!total) return 0;
    return Math.max(0, Math.min(1, 1 - this.chain.length / total));
  }

  /// Returns and clears the pending match-burst events (one per ball
  /// removed by a match since the last drain).
  drainMatchBursts() {
    const events = this._matchBursts;
    this._matchBursts = [];
    return events;
  }

  /// Returns and clears the pending projectile-impact events.
  drainImpactFlashes() {
    const events = this._impactFlashes;
    this._impactFlashes = [];
    return events;
  }

  _setupLevel() {
    const cfg = ZUMA_LEVELS[this.levelIndex];
    this.chain = [];
    this.projectiles = [];
    this.popups = [];
    this._matchBursts = [];
    this._impactFlashes = [];
    const spacing = this._ballSpacing;
    const headStart = cfg.ballCount * spacing;
    for (let i = 0; i < cfg.ballCount; i++) {
      this.chain.push({ type: randomBallType(), distance: headStart - i * spacing });
    }
    this.isLevelComplete = false;
  }

  setBoardSize(width, height) {
    this.boardWidth = width;
    this.boardHeight = height;
    // The chain-speed constants in ZUMA_LEVELS were tuned against the
    // path's old aspect-ratio-agnostic arc length; rescale them by how
    // much the real pixel arc length differs from that baseline, so a
    // level still takes the same real time to cross the path it always
    // did, regardless of screen aspect ratio.
    const baselineLength = this.path.totalLength;
    this.path.setPixelSize(width, height);
    this._speedScale = this.path.totalLength / baselineLength;
    this._setupLevel();
  }

  pause() {
    if (this.isGameOver || this.isPaused || this.isLevelComplete || this.isVictory) return;
    this.isPaused = true;
  }

  resume() {
    if (this.isGameOver || !this.isPaused) return;
    this.isPaused = false;
  }

  /// Called every frame by the scene with the elapsed seconds.
  update(dt) {
    if (this.isPaused || this.isGameOver || this.isLevelComplete || this.isVictory || !this.boardWidth) return;
    const clamped = Math.max(0, Math.min(dt, 0.05));
    this._advanceChain(clamped);
    this._advanceProjectiles(clamped);
    this._advancePopups(clamped);
  }

  _advanceChain(dt) {
    if (this.chain.length === 0) return;
    const speed = ZUMA_LEVELS[this.levelIndex].speed * this._speedScale;
    const spacing = this._ballSpacing;
    this.chain[0].distance += speed * dt;
    if (this.chain[0].distance >= this.path.totalLength) {
      this._lose();
      return;
    }
    for (let i = 1; i < this.chain.length; i++) {
      const target = this.chain[i - 1].distance - spacing;
      if (this.chain[i].distance < target) {
        this.chain[i].distance = Math.min(this.chain[i].distance + speed * dt, target);
      }
    }
  }

  _advanceProjectiles(dt) {
    for (const p of [...this.projectiles]) {
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      if (this._tryCollide(p)) continue;
      if (this._isOffBoard(p.position)) {
        this.projectiles = this.projectiles.filter((x) => x !== p);
      }
    }
  }

  _advancePopups(dt) {
    for (const p of this.popups) p.age += dt;
    this.popups = this.popups.filter((p) => p.age <= POPUP_LIFETIME);
  }

  _isOffBoard(pos) {
    const margin = 60;
    return pos.x < -margin || pos.x > this.boardWidth + margin || pos.y < -margin || pos.y > this.boardHeight + margin;
  }

  _tryCollide(p) {
    const threshold = this.ballRadius * 1.1;
    for (let i = 0; i < this.chain.length; i++) {
      const ballPos = this.path.pixelAt(this.chain[i].distance, this.boardWidth, this.boardHeight);
      if (Math.hypot(p.position.x - ballPos.x, p.position.y - ballPos.y) < threshold) {
        this._insertBall(p, i);
        return true;
      }
    }
    return false;
  }

  _tangentAtPixel(distance) {
    // A couple of pixels — small relative to the path's overall shape,
    // but comfortably larger than the ~pixel-per-sample resolution of the
    // path's point table, so the two probes reliably land in different
    // samples and give a well-defined direction.
    const eps = 2;
    const a = this.path.pixelAt(Math.max(distance - eps, 0), this.boardWidth, this.boardHeight);
    const b = this.path.pixelAt(Math.min(distance + eps, this.path.totalLength), this.boardWidth, this.boardHeight);
    return { x: b.x - a.x, y: b.y - a.y };
  }

  _insertBall(proj, hitIndex) {
    const spacing = this._ballSpacing;
    const hitBall = this.chain[hitIndex];
    const tangent = this._tangentAtPixel(hitBall.distance);
    const hitPixel = this.path.pixelAt(hitBall.distance, this.boardWidth, this.boardHeight);
    this._impactFlashes.push({ position: hitPixel, type: proj.type });
    const toProjectile = { x: proj.position.x - hitPixel.x, y: proj.position.y - hitPixel.y };
    const dot = tangent.x * toProjectile.x + tangent.y * toProjectile.y;
    // Positive dot: projectile is on the goal-facing side of the hit ball,
    // so the new ball slots in ahead of it (closer to the goal).
    const insertIndex = dot > 0 ? hitIndex : hitIndex + 1;

    let newDist;
    if (insertIndex <= 0) {
      newDist = this.chain.length > 0 ? this.chain[0].distance + spacing : this.path.totalLength * 0.5;
    } else if (insertIndex >= this.chain.length) {
      newDist = this.chain[this.chain.length - 1].distance - spacing;
    } else {
      newDist = this.chain[insertIndex - 1].distance - spacing;
    }

    this.chain.splice(insertIndex, 0, { type: proj.type, distance: newDist });
    for (let i = insertIndex + 1; i < this.chain.length; i++) {
      const maxAllowed = this.chain[i - 1].distance - spacing;
      if (this.chain[i].distance > maxAllowed) this.chain[i].distance = maxAllowed;
    }

    this.projectiles = this.projectiles.filter((p) => p !== proj);
    this._resolveMatchesFrom(insertIndex);
    if (this.chain.length === 0) {
      this._onChainCleared();
    }
  }

  _resolveMatchesFrom(insertIndex) {
    let idx = insertIndex;
    let comboStep = 0;
    while (idx >= 0 && idx < this.chain.length) {
      const type = this.chain[idx].type;
      let left = idx;
      while (left > 0 && this.chain[left - 1].type === type) left--;
      let right = idx;
      while (right < this.chain.length - 1 && this.chain[right + 1].type === type) right++;
      const runLength = right - left + 1;
      if (runLength < 3) break;
      const popupPos = this.path.pixelAt(this.chain[Math.floor((left + right) / 2)].distance, this.boardWidth, this.boardHeight);
      for (const removed of this.chain.slice(left, right + 1)) {
        this._matchBursts.push({
          type: removed.type,
          position: this.path.pixelAt(removed.distance, this.boardWidth, this.boardHeight),
        });
      }
      this.chain.splice(left, runLength);
      comboStep++;
      const gained = runLength * 10 * comboStep;
      this.score += gained;
      this.popups.push({ position: popupPos, amount: gained, age: 0, comboStep });
      idx = left - 1;
    }
    if (comboStep > 0) {
      Feedback.success();
      if (comboStep > 1) Feedback.celebrate();
    }
  }

  fire(target) {
    if (this.isPaused || this.isGameOver || this.isLevelComplete || this.isVictory || !this.boardWidth) return;
    const origin = this.shooterPosition;
    const dx = target.x - origin.x, dy = target.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const vx = (dx / dist) * PROJECTILE_SPEED, vy = (dy / dist) * PROJECTILE_SPEED;
    this.projectiles.push({ type: this.currentBall, position: { x: origin.x, y: origin.y }, velocity: { x: vx, y: vy } });
    this.currentBall = this.nextBall;
    this.nextBall = randomBallType();
    Feedback.tap();
  }

  _lose() {
    this.isGameOver = true;
    this.isNewRecord = reportScore(GameId.ZUMA, this.score);
    this.highScore = getHighScore(GameId.ZUMA);
    Feedback.gameOver();
  }

  _onChainCleared() {
    this.score += 500 * this.levelNumber;
    if (this.levelIndex >= ZUMA_LEVELS.length - 1) {
      this.isVictory = true;
      this.isNewRecord = reportScore(GameId.ZUMA, this.score);
      this.highScore = getHighScore(GameId.ZUMA);
      Feedback.celebrate();
    } else {
      this.isLevelComplete = true;
      Feedback.celebrate();
    }
  }

  nextLevel() {
    if (!this.isLevelComplete) return;
    this.levelIndex++;
    this.currentBall = randomBallType();
    this.nextBall = randomBallType();
    this._setupLevel();
  }

  reset() {
    this.levelIndex = 0;
    this.score = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.isLevelComplete = false;
    this.isNewRecord = false;
    this.currentBall = randomBallType();
    this.nextBall = randomBallType();
    this._setupLevel();
  }
}
