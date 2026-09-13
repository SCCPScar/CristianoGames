// A tetromino's cell layout at rotation state 0, inside an NxN bounding
// box (N = 4 for I, 2 for O, 3 for the rest). [row, col] pairs are the
// occupied cells.
const SHAPES = {
  I: [[1, 0], [1, 1], [1, 2], [1, 3]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 1], [1, 0], [1, 1], [1, 2]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
  J: [[0, 0], [1, 0], [1, 1], [1, 2]],
  L: [[0, 2], [1, 0], [1, 1], [1, 2]],
};

function boxSize(type) {
  if (type === 'I') return 4;
  if (type === 'O') return 2;
  return 3;
}

/// Rotates a set of [row, col] cells 90 degrees clockwise inside an NxN box.
function rotateClockwise(cells, n) {
  return cells.map(([r, c]) => [c, n - 1 - r]);
}

// Precomputed cell layout for every (type, rotationState) pair.
const ROTATIONS = {};
for (const type of Object.keys(SHAPES)) {
  const n = boxSize(type);
  const states = [SHAPES[type]];
  for (let i = 1; i < 4; i++) {
    states.push(rotateClockwise(states[i - 1], n));
  }
  ROTATIONS[type] = states;
}

export const TETROMINO_TYPES = Object.keys(SHAPES);

/// A falling piece: its type, rotation state (0-3), and the row/col of its
/// bounding box's top-left corner on the board.
export class Piece {
  constructor(type, rotation, row, col) {
    this.type = type;
    this.rotation = rotation;
    this.row = row;
    this.col = col;
  }

  get boxSize() {
    return boxSize(this.type);
  }

  get cells() {
    return ROTATIONS[this.type][((this.rotation % 4) + 4) % 4];
  }

  /// Absolute [row, col] board positions this piece currently occupies.
  get boardCells() {
    return this.cells.map(([r, c]) => [r + this.row, c + this.col]);
  }

  movedBy(dRow = 0, dCol = 0) {
    return new Piece(this.type, this.rotation, this.row + dRow, this.col + dCol);
  }

  rotated() {
    return new Piece(this.type, this.rotation + 1, this.row, this.col);
  }
}

/// Standard 7-bag randomizer: every one of the 7 pieces appears exactly
/// once before any repeats, so there are never unfair long droughts.
export class SevenBagRandomizer {
  constructor() {
    this._bag = [];
  }

  next() {
    if (this._bag.length === 0) {
      this._bag = [...TETROMINO_TYPES];
      for (let i = this._bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._bag[i], this._bag[j]] = [this._bag[j], this._bag[i]];
      }
    }
    return this._bag.pop();
  }
}
