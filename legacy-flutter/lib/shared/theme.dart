import 'package:flutter/material.dart';

/// Okabe-Ito colorblind-safe palette, validated for protanopia,
/// deuteranopia and tritanopia. Pure saturated red (#FF0000) and pure
/// saturated green (#00FF00) must never be used to carry meaning anywhere
/// in the app — only these eight colors are allowed for that purpose.
class OkabeIto {
  const OkabeIto._();

  static const black = Color(0xFF000000);
  static const orange = Color(0xFFE69F00);
  static const skyBlue = Color(0xFF56B4E9);
  static const bluishGreen = Color(0xFF009E73);
  static const yellow = Color(0xFFF0E442);
  static const blue = Color(0xFF0072B2);
  static const vermillion = Color(0xFFD55E00);
  static const reddishPurple = Color(0xFFCC79A7);
}

/// App-wide surface/text colors, chosen to keep WCAG AA contrast (>= 4.5:1
/// for normal text) between foreground and background.
class AppColors {
  const AppColors._();

  static const background = Color(0xFF121212);
  static const surface = Color(0xFF1E1E1E);
  static const surfaceHigh = Color(0xFF2A2A2A);
  static const textPrimary = Color(0xFFF5F5F5);
  static const textSecondary = Color(0xFFBDBDBD);
  static const accent = OkabeIto.skyBlue;
  static const danger = OkabeIto.vermillion;
  static const success = OkabeIto.bluishGreen;
}

/// The seven standard tetrominoes.
enum TetrominoType { i, o, t, s, z, j, l }

/// Visual identity of a tetromino: a color from the Okabe-Ito palette PLUS
/// its letter, drawn inside every block. The letter is the accessibility
/// redundancy so no piece is ever identified by color alone.
class TetrominoStyle {
  final Color color;
  final String letter;
  const TetrominoStyle(this.color, this.letter);
}

const Map<TetrominoType, TetrominoStyle> tetrominoStyles = {
  TetrominoType.i: TetrominoStyle(OkabeIto.skyBlue, 'I'),
  TetrominoType.o: TetrominoStyle(OkabeIto.yellow, 'O'),
  TetrominoType.t: TetrominoStyle(OkabeIto.reddishPurple, 'T'),
  TetrominoType.s: TetrominoStyle(OkabeIto.bluishGreen, 'S'),
  TetrominoType.z: TetrominoStyle(OkabeIto.vermillion, 'Z'),
  TetrominoType.j: TetrominoStyle(OkabeIto.blue, 'J'),
  TetrominoType.l: TetrominoStyle(OkabeIto.orange, 'L'),
};

/// The five Zuma-style ball types.
enum BallType { amber, sky, green, purple, vermillion }

/// Visual identity of a ball: a color from the Okabe-Ito palette PLUS a
/// distinct icon glyph drawn on top of it. Same rule as tetrominoes: never
/// identify a ball type by color alone.
class BallStyle {
  final Color color;
  final IconData icon;
  const BallStyle(this.color, this.icon);
}

const Map<BallType, BallStyle> ballStyles = {
  BallType.amber: BallStyle(OkabeIto.orange, Icons.adjust),
  BallType.sky: BallStyle(OkabeIto.skyBlue, Icons.change_history),
  BallType.green: BallStyle(OkabeIto.bluishGreen, Icons.star),
  BallType.purple: BallStyle(OkabeIto.reddishPurple, Icons.diamond),
  BallType.vermillion: BallStyle(OkabeIto.vermillion, Icons.square),
};

/// Picks a legible foreground (black or white) for text/icons drawn on top
/// of [background], based on relative luminance — keeps every piece/ball
/// glyph readable regardless of which palette color it sits on.
Color legibleForegroundOn(Color background) {
  return background.computeLuminance() > 0.5 ? Colors.black : Colors.white;
}

class AppTheme {
  const AppTheme._();

  static ThemeData get dark {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: base.colorScheme.copyWith(
        surface: AppColors.surface,
        primary: AppColors.accent,
        secondary: OkabeIto.orange,
        error: AppColors.danger,
      ),
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.textPrimary,
        displayColor: AppColors.textPrimary,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: legibleForegroundOn(AppColors.accent),
          minimumSize: const Size(64, 56),
          textStyle: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
      ),
      dialogTheme: const DialogThemeData(backgroundColor: AppColors.surface),
    );
  }
}
