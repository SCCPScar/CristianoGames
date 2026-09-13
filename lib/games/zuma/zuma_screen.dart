import 'package:flutter/material.dart';

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
    );
  }
}
