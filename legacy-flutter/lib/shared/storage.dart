import 'package:shared_preferences/shared_preferences.dart';

/// Which game a high score / setting belongs to.
enum GameId { tetris, zuma }

/// Thin wrapper around shared_preferences: local-only persistence for high
/// scores and the two settings toggles. No backend, no login.
class GameStorage {
  const GameStorage._();

  static String _highScoreKey(GameId game) => 'high_score_${game.name}';

  static const _soundEnabledKey = 'sound_enabled';
  static const _hapticsEnabledKey = 'haptics_enabled';

  static Future<int> getHighScore(GameId game) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_highScoreKey(game)) ?? 0;
  }

  /// Saves [score] as the new high score only if it beats the current one.
  /// Returns true when a new record was set.
  static Future<bool> reportScore(GameId game, int score) async {
    final prefs = await SharedPreferences.getInstance();
    final key = _highScoreKey(game);
    final current = prefs.getInt(key) ?? 0;
    if (score > current) {
      await prefs.setInt(key, score);
      return true;
    }
    return false;
  }

  static Future<bool> getSoundEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_soundEnabledKey) ?? true;
  }

  static Future<void> setSoundEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_soundEnabledKey, value);
  }

  static Future<bool> getHapticsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_hapticsEnabledKey) ?? true;
  }

  static Future<void> setHapticsEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_hapticsEnabledKey, value);
  }
}
