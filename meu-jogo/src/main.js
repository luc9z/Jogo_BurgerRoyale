import Phaser       from 'phaser';
import { GAME }     from './constants.js';
import MenuScene        from './scenes/MenuScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import GameScene        from './scenes/GameScene.js';
import PauseScene       from './scenes/PauseScene.js';
import UpgradeScene     from './scenes/UpgradeScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME.WIDTH, height: GAME.HEIGHT,
  parent: 'game',
  backgroundColor: '#08000d',
  // pixelArt:true = NEAREST filter + roundPixels — elimina blur bilinear interno do WebGL
  // CSS já tem image-rendering:pixelated; sem isso o texto fica turvo no upscaling
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [MenuScene, LevelSelectScene, GameScene, PauseScene, UpgradeScene],
});
