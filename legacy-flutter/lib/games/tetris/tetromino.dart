import 'dart:math';

import '../../shared/theme.dart';

/// A tetromino's cell layout at rotation state 0, inside an NxN bounding
/// box (N = 4 for I, 2 for O, 3 for the rest). Row/col pairs are the
/// occupied cells.
const Map<TetrominoType, List<Point<int>>> _shapes = {
  TetrominoType.i: [Point(1, 0), Point(1, 1), Point(1, 2), Point(1, 3)],
  TetrominoType.o: [Point(0, 0), Point(0, 1), Point(1, 0), Point(1, 1)],
  TetrominoType.t: [Point(0, 1), Point(1, 0), Point(1, 1), Point(1, 2)],
  TetrominoType.s: [Point(0, 1), Point(0, 2), Point(1, 0), Point(1, 1)],
  TetrominoType.z: [Point(0, 0), Point(0, 1), Point(1, 1), Point(1, 2)],
  TetrominoType.j: [Point(0, 0), Point(1, 0), Point(1, 1), Point(1, 2)],
  TetrominoType.l: [Point(0, 2), Point(1, 0), Point(1, 1), Point(1, 2)],
};

int _boxSize(TetrominoType type) {
  switch (type) {
    case TetrominoType.i:
      return 4;
    case TetrominoType.o:
      return 2;
    default:
      return 3;
  }
}

/// Rotates a set of (row, col) cells 90 degrees clockwise inside an NxN box.
List<Point<int>> _rotateClockwise(List<Point<int>> cells, int n) {
  return cells.map((p) => Point(p.y, n - 1 - p.x)).toList();
}

/// Precomputed cell layout for every (type, rotationState) pair, so
/// rotating at runtime is just an array lookup.
final Map<TetrominoType, List<List<Point<int>>>> _rotations = {
  for (final type in TetrominoType.values) type: _buildRotations(type),
};

List<List<Point<int>>> _buildRotations(TetrominoType type) {
  final n = _boxSize(type);
  final states = <List<Point<int>>>[_shapes[type]!];
  for (var i = 1; i < 4; i++) {
    states.add(_rotateClockwise(states[i - 1], n));
  }
  return states;
}

/// A falling piece: its type, rotation state (0-3), and the row/col of its
/// bounding box's top-left corner on the board.
class Piece {
  final TetrominoType type;
  final int rotation;
  final int row;
  final int col;

  const Piece({required this.type, required this.rotation, required this.row, required this.col});

  int get boxSize => _boxSize(type);

  List<Point<int>> get cells => _rotations[type]![rotation % 4];

  /// Absolute (row, col) board positions this piece currently occupies.
  List<Point<int>> get boardCells => cells.map((p) => Point(p.x + row, p.y + col)).toList();

  Piece movedBy({int dRow = 0, int dCol = 0}) => Piece(type: type, rotation: rotation, row: row + dRow, col: col + dCol);

  Piece rotated() => Piece(type: type, rotation: rotation + 1, row: row, col: col);

  Piece withPosition(int newRow, int newCol) => Piece(type: type, rotation: rotation, row: newRow, col: newCol);
}

/// Standard 7-bag randomizer: every one of the 7 pieces appears exactly
/// once before any repeats, so there are never unfair long droughts.
class SevenBagRandomizer {
  final Random _random;
  final List<TetrominoType> _bag = [];

  SevenBagRandomizer({Random? random}) : _random = random ?? Random();

  TetrominoType next() {
    if (_bag.isEmpty) {
      _bag.addAll(TetrominoType.values);
      _bag.shuffle(_random);
    }
    return _bag.removeLast();
  }
}
