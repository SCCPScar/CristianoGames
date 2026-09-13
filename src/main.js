import Phaser from 'phaser';
import { HomeScene } from './scenes/HomeScene.js';
import { TetrisScene } from './scenes/TetrisScene.js';
import { ZumaScene } from './scenes/ZumaScene.js';
import { AppColors } from './shared/theme.js';

const GAME_WIDTH = 412;
const GAME_HEIGHT = 915;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: AppColors.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [HomeScene, TetrisScene, ZumaScene],
});
