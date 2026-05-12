import Phaser     from 'phaser';
import { GAME }   from './constants.js';
import MenuScene  from './scenes/MenuScene.js';
import GameScene  from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME.WIDTH, height: GAME.HEIGHT,
  parent: 'game',
  backgroundColor: '#08000d',
  pixelArt: true, roundPixels: true,
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [MenuScene, GameScene, PauseScene],
});
