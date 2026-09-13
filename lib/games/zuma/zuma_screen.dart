import 'package:flutter/material.dart';

import '../../shared/theme.dart';
import '../../shared/widgets/game_over_dialog.dart';
import '../../shared/widgets/pause_dialog.dart';
import 'zuma_controller.dart';
import 'zuma_painter.dart';

class ZumaScreen extends StatefulWidget {
  const ZumaScreen({super.key});

  @override
  State<ZumaScreen> createState() => _ZumaScreenState();
}

class _ZumaScreenState extends State<ZumaScreen> {
  late final ZumaController controller;
  Offset? _aimTarget;
  bool _dialogShown = false;

  @override
  void initState() {
    super.initState();
    controller = ZumaController();
    controller.addListener(_onControllerChange);
  }

  void _onControllerChange() {
    final done = controller.isGameOver || controller.isLevelComplete || controller.isVictory;
    if (done && !_dialogShown) {
      _dialogShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showEndDialog();
      });
    }
  }

  void _showEndDialog() {
    final isLoss = controller.isGameOver;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => GameOverDialog(
        isVictory: !isLoss,
        score: controller.score,
        bestScore: controller.highScore,
        isNewRecord: controller.isNewRecord,
        onNext: controller.isLevelComplete
            ? () {
                Navigator.of(context).pop();
                _dialogShown = false;
                controller.nextLevel();
              }
            : null,
        onPlayAgain: () {
          Navigator.of(context).pop();
          _dialogShown = false;
          controller.reset();
        },
        onMenu: () {
          Navigator.of(context).pop();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _openPauseMenu() {
    if (controller.isGameOver || controller.isPaused || controller.isLevelComplete || controller.isVictory) return;
    controller.pause();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => PauseDialog(
        onResume: () {
          Navigator.of(context).pop();
          controller.resume();
        },
        onExit: () {
          Navigator.of(context).pop();
          Navigator.of(context).pop();
        },
      ),
    );
  }

  @override
  void dispose() {
    controller.removeListener(_onControllerChange);
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: AnimatedBuilder(
          animation: controller,
          builder: (_, _) => Text(
            'Pontos: ${controller.score} · Nível ${controller.levelNumber}/${controller.totalLevels}',
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.pause_circle_outline),
            tooltip: 'Pausar',
            onPressed: _openPauseMenu,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            AnimatedBuilder(
              animation: controller,
              builder: (_, _) => _NextBallPreview(type: controller.nextBall),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF6b6152), Color(0xFF23201a)],
                    ),
                    boxShadow: const [
                      BoxShadow(color: Colors.black54, blurRadius: 10, offset: Offset(0, 4)),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(9),
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTapUp: (details) => controller.fire(details.localPosition),
                      onPanStart: (details) => setState(() => _aimTarget = details.localPosition),
                      onPanUpdate: (details) => setState(() => _aimTarget = details.localPosition),
                      onPanEnd: (_) {
                        if (_aimTarget != null) controller.fire(_aimTarget!);
                        setState(() => _aimTarget = null);
                      },
                      child: SizedBox.expand(
                        child: CustomPaint(painter: ZumaPainter(controller, aimTarget: _aimTarget)),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NextBallPreview extends StatelessWidget {
  final BallType type;
  const _NextBallPreview({required this.type});

  @override
  Widget build(BuildContext context) {
    final style = ballStyles[type]!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('Próxima: ', style: TextStyle(color: AppColors.textSecondary)),
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(color: style.color, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Icon(style.icon, size: 16, color: legibleForegroundOn(style.color)),
          ),
        ],
      ),
    );
  }
}
