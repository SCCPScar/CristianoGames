import 'dart:async';
import 'dart:math';
import 'dart:ui';

import 'package:flutter/foundation.dart';

import '../../shared/feedback_service.dart';
import '../../shared/storage.dart';
import '../../shared/theme.dart';
import 'path_model.dart';

class LevelConfig {
  final int ballCount;
  final double speed; // normalized path-length units per second
  const LevelConfig(this.ballCount, this.speed);
}

const List<LevelConfig> zumaLevels = [
  LevelConfig(10, 0.045),
  LevelConfig(13, 0.050),
  LevelConfig(16, 0.055),
  LevelConfig(19, 0.060),
  LevelConfig(22, 0.065),
];

const double _spacing = 0.05;
const double _projectileSpeed = 1100.0;

class ChainBall {
  final BallType type;
  double distance;
  ChainBall({required this.type, required this.distance});
}

class Projectile {
  final BallType type;
  Offset position;
  final Offset velocity;
  Projectile({required this.type, required this.position, required this.velocity});
}

/// A short-lived "+N" floating score label, spawned where a run pops.
class ScorePopup {
  final Offset position;
  final int amount;
  double age = 0;
  ScorePopup({required this.position, required this.amount});
}

const double _popupLifetime = 0.9;

/// Owns all Zuma game state: the ball chain, the shooter, projectiles,
/// scoring, levels and timing. The UI (ZumaScreen) only reads this and
/// calls fire()/pause()/resume()/nextLevel()/reset().
class ZumaController extends ChangeNotifier {
  final GamePath path = GamePath.spiral();
  final Random _random = Random();

  final List<ChainBall> chain = [];
  final List<Projectile> projectiles = [];
  final List<ScorePopup> popups = [];

  Size? boardSize;
  int levelIndex = 0;
  int score = 0;
  int highScore = 0;
  bool isPaused = false;
  bool isGameOver = false;
  bool isLevelComplete = false;
  bool isVictory = false;
  bool isNewRecord = false;

  late BallType currentBall;
  late BallType nextBall;

  Timer? _timer;
  DateTime? _lastTickTime;

  ZumaController() {
    currentBall = _randomType();
    nextBall = _randomType();
    _setupLevel();
    _loadHighScore();
  }

  int get levelNumber => levelIndex + 1;
  int get totalLevels => zumaLevels.length;

  double get ballRadius {
    if (boardSize == null) return 16;
    return (boardSize!.shortestSide * 0.045).clamp(12.0, 20.0);
  }

  Offset get shooterPosition {
    final size = boardSize;
    if (size == null) return Offset.zero;
    return Offset(size.width * path.center.dx, size.height * path.center.dy);
  }

  BallType _randomType() => BallType.values[_random.nextInt(BallType.values.length)];

  Future<void> _loadHighScore() async {
    highScore = await GameStorage.getHighScore(GameId.zuma);
    notifyListeners();
  }

  void _setupLevel() {
    final cfg = zumaLevels[levelIndex];
    chain.clear();
    projectiles.clear();
    popups.clear();
    final headStart = (cfg.ballCount - 1) * _spacing + 0.05;
    for (var i = 0; i < cfg.ballCount; i++) {
      chain.add(ChainBall(type: _randomType(), distance: headStart - i * _spacing));
    }
    isLevelComplete = false;
  }

  void updateBoardSize(Size size) {
    final firstTime = boardSize == null;
    boardSize = size;
    if (firstTime) {
      start();
    }
  }

  void start() {
    _lastTickTime = null;
    _scheduleTimer();
  }

  void _scheduleTimer() {
    _timer?.cancel();
    if (isPaused || isGameOver || isLevelComplete || isVictory) return;
    _timer = Timer.periodic(const Duration(milliseconds: 16), (_) => _tick());
  }

  void pause() {
    if (isGameOver || isPaused || isLevelComplete || isVictory) return;
    isPaused = true;
    _timer?.cancel();
    notifyListeners();
  }

  void resume() {
    if (isGameOver || !isPaused) return;
    isPaused = false;
    _lastTickTime = null;
    _scheduleTimer();
    notifyListeners();
  }

  void _tick() {
    if (isPaused || isGameOver || isLevelComplete || isVictory || boardSize == null) return;
    final now = DateTime.now();
    final dt = _lastTickTime == null ? 0.016 : now.difference(_lastTickTime!).inMicroseconds / 1e6;
    _lastTickTime = now;
    _advanceChain(dt.clamp(0.0, 0.05));
    _advanceProjectiles(dt.clamp(0.0, 0.05));
    _advancePopups(dt.clamp(0.0, 0.05));
    notifyListeners();
  }

  void _advancePopups(double dt) {
    for (final p in popups) {
      p.age += dt;
    }
    popups.removeWhere((p) => p.age > _popupLifetime);
  }

  void _advanceChain(double dt) {
    if (chain.isEmpty) return;
    final speed = zumaLevels[levelIndex].speed;
    chain[0].distance += speed * dt;
    if (chain[0].distance >= path.totalLength) {
      _lose();
      return;
    }
    for (var i = 1; i < chain.length; i++) {
      final target = chain[i - 1].distance - _spacing;
      if (chain[i].distance < target) {
        chain[i].distance = min(chain[i].distance + speed * dt, target);
      }
    }
  }

  void _advanceProjectiles(double dt) {
    for (final p in List<Projectile>.of(projectiles)) {
      p.position += p.velocity * dt;
      if (_tryCollide(p)) continue;
      if (_isOffBoard(p.position)) {
        projectiles.remove(p);
      }
    }
  }

  bool _isOffBoard(Offset pos) {
    final size = boardSize!;
    const margin = 60.0;
    return pos.dx < -margin || pos.dx > size.width + margin || pos.dy < -margin || pos.dy > size.height + margin;
  }

  bool _tryCollide(Projectile p) {
    final threshold = ballRadius * 1.1;
    for (var i = 0; i < chain.length; i++) {
      final ballPos = path.pixelAt(chain[i].distance, boardSize!);
      if ((p.position - ballPos).distance < threshold) {
        _insertBall(p, i);
        return true;
      }
    }
    return false;
  }

  Offset _tangentAtPixel(double distance) {
    const eps = 0.001;
    final a = path.pixelAt(max(distance - eps, 0), boardSize!);
    final b = path.pixelAt(min(distance + eps, path.totalLength), boardSize!);
    return b - a;
  }

  void _insertBall(Projectile proj, int hitIndex) {
    final hitBall = chain[hitIndex];
    final tangent = _tangentAtPixel(hitBall.distance);
    final hitPixel = path.pixelAt(hitBall.distance, boardSize!);
    final toProjectile = proj.position - hitPixel;
    final dot = tangent.dx * toProjectile.dx + tangent.dy * toProjectile.dy;
    // Positive dot: projectile is on the goal-facing side of the hit ball,
    // so the new ball slots in ahead of it (closer to the goal).
    final insertIndex = dot > 0 ? hitIndex : hitIndex + 1;

    double newDist;
    if (insertIndex <= 0) {
      newDist = chain.isNotEmpty ? chain[0].distance + _spacing : path.totalLength * 0.5;
    } else if (insertIndex >= chain.length) {
      newDist = chain.last.distance - _spacing;
    } else {
      newDist = chain[insertIndex - 1].distance - _spacing;
    }

    chain.insert(insertIndex, ChainBall(type: proj.type, distance: newDist));
    for (var i = insertIndex + 1; i < chain.length; i++) {
      final maxAllowed = chain[i - 1].distance - _spacing;
      if (chain[i].distance > maxAllowed) {
        chain[i].distance = maxAllowed;
      }
    }

    projectiles.remove(proj);
    _resolveMatchesFrom(insertIndex);
    if (chain.isEmpty) {
      _onChainCleared();
    }
  }

  void _resolveMatchesFrom(int insertIndex) {
    var idx = insertIndex;
    var comboStep = 0;
    while (idx >= 0 && idx < chain.length) {
      final type = chain[idx].type;
      var left = idx;
      while (left > 0 && chain[left - 1].type == type) {
        left--;
      }
      var right = idx;
      while (right < chain.length - 1 && chain[right + 1].type == type) {
        right++;
      }
      final runLength = right - left + 1;
      if (runLength < 3) break;
      final popupPos = path.pixelAt(chain[(left + right) ~/ 2].distance, boardSize!);
      chain.removeRange(left, right + 1);
      comboStep++;
      final gained = runLength * 10 * comboStep;
      score += gained;
      popups.add(ScorePopup(position: popupPos, amount: gained));
      idx = left - 1;
    }
    if (comboStep > 0) {
      FeedbackService.success();
      if (comboStep > 1) FeedbackService.celebrate();
    }
  }

  void fire(Offset target) {
    if (isPaused || isGameOver || isLevelComplete || isVictory || boardSize == null) return;
    final origin = shooterPosition;
    final dir = target - origin;
    if (dir.distance < 1) return;
    final normalized = dir / dir.distance;
    projectiles.add(Projectile(type: currentBall, position: origin, velocity: normalized * _projectileSpeed));
    currentBall = nextBall;
    nextBall = _randomType();
    FeedbackService.tap();
    notifyListeners();
  }

  Future<void> _lose() async {
    isGameOver = true;
    _timer?.cancel();
    isNewRecord = await GameStorage.reportScore(GameId.zuma, score);
    highScore = await GameStorage.getHighScore(GameId.zuma);
    FeedbackService.gameOver();
    notifyListeners();
  }

  Future<void> _onChainCleared() async {
    _timer?.cancel();
    score += 500 * levelNumber;
    if (levelIndex >= zumaLevels.length - 1) {
      isVictory = true;
      isNewRecord = await GameStorage.reportScore(GameId.zuma, score);
      highScore = await GameStorage.getHighScore(GameId.zuma);
      FeedbackService.celebrate();
    } else {
      isLevelComplete = true;
      FeedbackService.celebrate();
    }
    notifyListeners();
  }

  void nextLevel() {
    if (!isLevelComplete) return;
    levelIndex++;
    currentBall = _randomType();
    nextBall = _randomType();
    _setupLevel();
    start();
    notifyListeners();
  }

  void reset() {
    levelIndex = 0;
    score = 0;
    isGameOver = false;
    isVictory = false;
    isLevelComplete = false;
    isNewRecord = false;
    currentBall = _randomType();
    nextBall = _randomType();
    _setupLevel();
    start();
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
