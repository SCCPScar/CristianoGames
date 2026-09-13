import 'package:flutter/material.dart';

import '../games/tetris/tetris_screen.dart';
import '../games/zuma/zuma_screen.dart';
import '../shared/palette_demo_screen.dart';
import '../shared/storage.dart';
import '../shared/theme.dart';
import 'settings_dialog.dart';

/// Home screen: app title and two large, shape-distinct cards to pick a
/// game. Icons differ in silhouette (not just color) so they stay
/// distinguishable in grayscale.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tetrisHighScore = 0;
  int _zumaHighScore = 0;

  @override
  void initState() {
    super.initState();
    _loadHighScores();
  }

  Future<void> _loadHighScores() async {
    final tetris = await GameStorage.getHighScore(GameId.tetris);
    final zuma = await GameStorage.getHighScore(GameId.zuma);
    if (!mounted) return;
    setState(() {
      _tetrisHighScore = tetris;
      _zumaHighScore = zuma;
    });
  }

  Future<void> _openGame(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
    _loadHighScores();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onLongPress: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const PaletteDemoScreen()),
          ),
          child: const Text('Arcade do Pai'),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Configurações',
            onPressed: () => showDialog(
              context: context,
              builder: (_) => const SettingsDialog(),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _GameCard(
                  title: 'TETRIS',
                  highScore: _tetrisHighScore,
                  color: OkabeIto.skyBlue,
                  iconBuilder: (color) => Icon(Icons.view_column, size: 56, color: color),
                  onTap: () => _openGame(const TetrisScreen()),
                ),
                const SizedBox(height: 24),
                _GameCard(
                  title: 'ZUMA',
                  highScore: _zumaHighScore,
                  color: OkabeIto.reddishPurple,
                  iconBuilder: (color) => _BallChainIcon(color: color),
                  onTap: () => _openGame(const ZumaScreen()),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GameCard extends StatelessWidget {
  final String title;
  final int highScore;
  final Color color;
  final Widget Function(Color color) iconBuilder;
  final VoidCallback onTap;

  const _GameCard({
    required this.title,
    required this.highScore,
    required this.color,
    required this.iconBuilder,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$title, recorde $highScore pontos',
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Container(
            width: 260,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: color, width: 2),
            ),
            child: Column(
              children: [
                iconBuilder(color),
                const SizedBox(height: 12),
                Text(
                  title,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Recorde: $highScore',
                  style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A short chain of ball icons — the Zuma home-screen glyph. Deliberately a
/// row of circles (not blocks) so it is a different silhouette than the
/// Tetris icon even without color.
class _BallChainIcon extends StatelessWidget {
  final Color color;
  const _BallChainIcon({required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(4, (i) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Icon(Icons.circle, size: 20 + (i.isEven ? 4 : 0), color: color),
        );
      }),
    );
  }
}
