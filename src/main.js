import Phaser from 'phaser';
import { HomeScene } from './scenes/HomeScene.js';
import { TetrisScene } from './scenes/TetrisScene.js';
import { ZumaScene } from './scenes/ZumaScene.js';
import { AppColors } from './shared/theme.js';
import { LANDSCAPE_SIZE } from './shared/orientation.js';

// Home and Zuma want a wide board; Tetris wants a tall one. Each scene
// calls setOrientation() as it starts, resizing the game and (where the
// platform allows it) physically rotating the screen to match — this is
// just the initial shape, matching Home, the entry point.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: AppColors.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LANDSCAPE_SIZE.width,
    height: LANDSCAPE_SIZE.height,
  },
  scene: [HomeScene, TetrisScene, ZumaScene],
});
