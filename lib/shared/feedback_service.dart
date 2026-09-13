import 'package:flutter/services.dart';

import 'storage.dart';

/// Centralizes sound + haptics so every game event goes through the same
/// on/off checks instead of scattering settings reads across the codebase.
class FeedbackService {
  const FeedbackService._();

  static Future<void> tap() async {
    if (await GameStorage.getSoundEnabled()) {
      SystemSound.play(SystemSoundType.click);
    }
    if (await GameStorage.getHapticsEnabled()) {
      HapticFeedback.selectionClick();
    }
  }

  /// Line clear, ball pop, piece lock — a light positive event.
  static Future<void> success() async {
    if (await GameStorage.getSoundEnabled()) {
      SystemSound.play(SystemSoundType.click);
    }
    if (await GameStorage.getHapticsEnabled()) {
      HapticFeedback.lightImpact();
    }
  }

  /// Combo/cascade or level complete — a stronger positive event.
  static Future<void> celebrate() async {
    if (await GameStorage.getSoundEnabled()) {
      SystemSound.play(SystemSoundType.click);
    }
    if (await GameStorage.getHapticsEnabled()) {
      HapticFeedback.mediumImpact();
    }
  }

  /// Game over — always paired with icon + text on screen, never relies on
  /// sound/vibration alone to convey "bad" (see accessibility rules).
  static Future<void> gameOver() async {
    if (await GameStorage.getSoundEnabled()) {
      SystemSound.play(SystemSoundType.alert);
    }
    if (await GameStorage.getHapticsEnabled()) {
      HapticFeedback.heavyImpact();
    }
  }
}
