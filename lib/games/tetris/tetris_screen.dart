import 'package:flutter/material.dart';

import '../../shared/theme.dart';
import '../../shared/widgets/big_control_button.dart';
import '../../shared/widgets/game_over_dialog.dart';
import '../../shared/widgets/pause_dialog.dart';
import 'board_painter.dart';
import 'tetris_controller.dart';

class TetrisScreen extends StatefulWidget {
  const TetrisScreen({super.key});

  @override
  State<TetrisScreen> createState() => _TetrisScreenState();
}

class _TetrisScreenState extends State<TetrisScreen> {
  late final TetrisController controller;
  bool _gameOverDialogShown = false;
  double _dragDx = 0;
  double _dragDy = 0;

  static const double _dragStep = 24.0;
  static const double _hardDropVelocity = 1200.0;

  @override
  void initState() {
    super.initState();
    controller = TetrisController();
    controller.addListener(_onControllerChange);
    controller.start();
  }

  void _onControllerChange() {
    if (controller.isGameOver && !_gameOverDialogShown) {
      _gameOverDialogShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _showGameOverDialog();
      });
    }
  }

  void _showGameOverDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => GameOverDialog(
        score: controller.score,
        bestScore: controller.highScore,
        isNewRecord: controller.isNewRecord,
        onPlayAgain: () {
          Navigator.of(context).pop();
          _gameOverDialogShown = false;
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
    if (controller.isGameOver || controller.isPaused) return;
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

  void _handlePanUpdate(DragUpdateDetails details) {
    _dragDx += details.delta.dx;
    _dragDy += details.delta.dy;
    while (_dragDx.abs() >= _dragStep) {
      if (_dragDx > 0) {
        controller.moveRight();
        _dragDx -= _dragStep;
      } else {
        controller.moveLeft();
        _dragDx += _dragStep;
      }
    }
    while (_dragDy >= _dragStep) {
      controller.softDrop();
      _dragDy -= _dragStep;
    }
  }

  void _handlePanEnd(DragEndDetails details) {
    if (details.velocity.pixelsPerSecond.dy > _hardDropVelocity) {
      controller.hardDrop();
    }
    _dragDx = 0;
    _dragDy = 0;
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
          builder: (_, _) => Text('Pontos: ${controller.score} · Nível: ${controller.level}'),
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
              builder: (_, _) => _NextPreview(types: controller.nextPreview),
            ),
            Expanded(
              child: Center(
                child: AspectRatio(
                  aspectRatio: boardCols / boardRows,
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: controller.rotate,
                    onPanUpdate: _handlePanUpdate,
                    onPanEnd: _handlePanEnd,
                    child: CustomPaint(painter: TetrisBoardPainter(controller)),
                  ),
                ),
              ),
            ),
            _Controls(controller: controller),
          ],
        ),
      ),
    );
  }
}

class _NextPreview extends StatelessWidget {
  final List<TetrominoType> types;
  const _NextPreview({required this.types});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('Próximas: ', style: TextStyle(color: AppColors.textSecondary)),
          for (final type in types) _MiniPiece(type: type),
        ],
      ),
    );
  }
}

class _MiniPiece extends StatelessWidget {
  final TetrominoType type;
  const _MiniPiece({required this.type});

  @override
  Widget build(BuildContext context) {
    final style = tetrominoStyles[type]!;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(color: style.color, borderRadius: BorderRadius.circular(6)),
        alignment: Alignment.center,
        child: Text(
          style.letter,
          style: TextStyle(color: legibleForegroundOn(style.color), fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}

class _Controls extends StatelessWidget {
  final TetrisController controller;
  const _Controls({required this.controller});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          BigControlButton(icon: Icons.arrow_back, label: 'Esquerda', onPressed: controller.moveLeft),
          BigControlButton(icon: Icons.rotate_right, label: 'Girar', onPressed: controller.rotate),
          BigControlButton(icon: Icons.arrow_forward, label: 'Direita', onPressed: controller.moveRight),
          BigControlButton(icon: Icons.arrow_downward, label: 'Descer devagar', onPressed: controller.softDrop),
          BigControlButton(
            icon: Icons.keyboard_double_arrow_down,
            label: 'Descer rápido',
            onPressed: controller.hardDrop,
          ),
        ],
      ),
    );
  }
}
