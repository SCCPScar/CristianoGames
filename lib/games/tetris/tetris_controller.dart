import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';

import '../../shared/feedback_service.dart';
import '../../shared/storage.dart';
import '../../shared/theme.dart';
import 'tetromino.dart';

const int boardRows = 20;
const int boardCols = 10;
const int _previewCount = 3;
const int _linesPerLevel = 10;

/// Owns all Tetris game state: board, falling piece, score, level, timing.
/// The UI (TetrisScreen) only reads this and calls the move/rotate/drop
/// methods — no game logic lives in the widget tree.
class TetrisController extends ChangeNotifier {
  final SevenBagRandomizer _bag = SevenBagRandomizer();
  final List<List<TetrominoType?>> board = List.generate(
    boardRows,
    (_) => List<TetrominoType?>.filled(boardCols, null),
  );

  final List<TetrominoType> _queue = [];
  late Piece current;

  int score = 0;
  int linesCleared = 0;
  int level = 1;
  int highScore = 0;
  bool isGameOver = false;
  bool isPaused = false;
  bool isNewRecord = false;

  Timer? _timer;

  TetrisController() {
    while (_queue.length < _previewCount + 1) {
      _queue.add(_bag.next());
    }
    current = _spawnPiece(_queue.removeAt(0));
    _refillQueue();
    _loadHighScore();
  }

  List<TetrominoType> get nextPreview => List.unmodifiable(_queue.take(_previewCount));

  Future<void> _loadHighScore() async {
    highScore = await GameStorage.getHighScore(GameId.tetris);
    notifyListeners();
  }

  void _refillQueue() {
    while (_queue.length < _previewCount) {
      _queue.add(_bag.next());
    }
  }

  Piece _spawnPiece(TetrominoType type) {
    final boxSize = type == TetrominoType.i ? 4 : (type == TetrominoType.o ? 2 : 3);
    final col = (boardCols - boxSize) ~/ 2;
    return Piece(type: type, rotation: 0, row: 0, col: col);
  }

  void start() {
    _scheduleTimer();
  }

  void _scheduleTimer() {
    _timer?.cancel();
    if (isGameOver || isPaused) return;
    final intervalMs = max(100, 800 - (level - 1) * 60);
    _timer = Timer.periodic(Duration(milliseconds: intervalMs), (_) => _tick());
  }

  void pause() {
    if (isGameOver || isPaused) return;
    isPaused = true;
    _timer?.cancel();
    notifyListeners();
  }

  void resume() {
    if (isGameOver || !isPaused) return;
    isPaused = false;
    _scheduleTimer();
    notifyListeners();
  }

  bool _canPlace(Piece piece) {
    for (final cell in piece.boardCells) {
      if (cell.x < 0 || cell.x >= boardRows) return false;
      if (cell.y < 0 || cell.y >= boardCols) return false;
      if (board[cell.x][cell.y] != null) return false;
    }
    return true;
  }

  void _tick() {
    if (!_tryMove(dRow: 1)) {
      _lockCurrentPiece();
    }
  }

  bool _tryMove({int dRow = 0, int dCol = 0}) {
    if (isGameOver || isPaused) return false;
    final moved = current.movedBy(dRow: dRow, dCol: dCol);
    if (_canPlace(moved)) {
      current = moved;
      notifyListeners();
      return true;
    }
    return false;
  }

  void moveLeft() => _tryMove(dCol: -1);
  void moveRight() => _tryMove(dCol: 1);

  void softDrop() {
    if (!_tryMove(dRow: 1)) {
      _lockCurrentPiece();
    }
  }

  void hardDrop() {
    if (isGameOver || isPaused) return;
    var piece = current;
    while (_canPlace(piece.movedBy(dRow: 1))) {
      piece = piece.movedBy(dRow: 1);
    }
    current = piece;
    _lockCurrentPiece();
  }

  static const List<Point<int>> _wallKicks = [
    Point(0, 0),
    Point(-1, 0),
    Point(1, 0),
    Point(-2, 0),
    Point(2, 0),
    Point(0, -1),
  ];

  void rotate() {
    if (isGameOver || isPaused) return;
    final rotated = current.rotated();
    for (final kick in _wallKicks) {
      final attempt = rotated.movedBy(dCol: kick.x, dRow: kick.y);
      if (_canPlace(attempt)) {
        current = attempt;
        notifyListeners();
        FeedbackService.tap();
        return;
      }
    }
  }

  /// Returns the row the current piece would land on if hard-dropped now,
  /// for the ghost-piece outline.
  Piece get ghostPiece {
    var piece = current;
    while (_canPlace(piece.movedBy(dRow: 1))) {
      piece = piece.movedBy(dRow: 1);
    }
    return piece;
  }

  void _lockCurrentPiece() {
    for (final cell in current.boardCells) {
      if (cell.x >= 0 && cell.x < boardRows) {
        board[cell.x][cell.y] = current.type;
      }
    }
    final cleared = _clearFullLines();
    if (cleared > 0) {
      _applyScoring(cleared);
      FeedbackService.success();
    }
    _spawnNext();
  }

  int _clearFullLines() {
    final fullRows = <int>[];
    for (var r = 0; r < boardRows; r++) {
      if (board[r].every((cell) => cell != null)) {
        fullRows.add(r);
      }
    }
    for (final r in fullRows) {
      board.removeAt(r);
      board.insert(0, List<TetrominoType?>.filled(boardCols, null));
    }
    return fullRows.length;
  }

  void _applyScoring(int cleared) {
    const pointsPerClear = {1: 100, 2: 300, 3: 500, 4: 800};
    score += (pointsPerClear[cleared] ?? 800) * level;
    linesCleared += cleared;
    final newLevel = 1 + linesCleared ~/ _linesPerLevel;
    if (newLevel != level) {
      level = newLevel;
      _scheduleTimer();
    }
  }

  void _spawnNext() {
    final type = _queue.removeAt(0);
    _refillQueue();
    final spawned = _spawnPiece(type);
    if (!_canPlace(spawned)) {
      current = spawned;
      _endGame();
      return;
    }
    current = spawned;
    notifyListeners();
  }

  Future<void> _endGame() async {
    isGameOver = true;
    _timer?.cancel();
    isNewRecord = await GameStorage.reportScore(GameId.tetris, score);
    highScore = await GameStorage.getHighScore(GameId.tetris);
    FeedbackService.gameOver();
    notifyListeners();
  }

  void reset() {
    for (final row in board) {
      row.fillRange(0, boardCols, null);
    }
    _queue.clear();
    while (_queue.length < _previewCount + 1) {
      _queue.add(_bag.next());
    }
    current = _spawnPiece(_queue.removeAt(0));
    _refillQueue();
    score = 0;
    linesCleared = 0;
    level = 1;
    isGameOver = false;
    isPaused = false;
    isNewRecord = false;
    notifyListeners();
    start();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
