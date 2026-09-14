import Phaser from 'phaser';
import { HomeScene } from './scenes/HomeScene.js';
import { TetrisScene } from './scenes/TetrisScene.js';
import { ZumaScene } from './scenes/ZumaScene.js';
import { AppColors } from './shared/theme.js';

const GAME_WIDTH = 915;
const GAME_HEIGHT = 412;

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

// Best-effort: in the installed Android app (and fullscreen PWAs) this
// locks rotation to landscape. Ignored where unsupported (e.g. a normal
// browser tab) — the CSS "rotate hint" in index.html covers that case.
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(() => {});
}
