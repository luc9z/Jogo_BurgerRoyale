import Phaser       from 'phaser';
import { GAME }     from './constants.js';
import MenuScene        from './scenes/MenuScene.js';
import StoryScene       from './scenes/StoryScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import GameScene        from './scenes/GameScene.js';
import PauseScene       from './scenes/PauseScene.js';
import UpgradeScene     from './scenes/UpgradeScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME.WIDTH, height: GAME.HEIGHT,
  parent: 'game',
  backgroundColor: '#08000d',
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { gamepad: true },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [MenuScene, StoryScene, LevelSelectScene, GameScene, PauseScene, UpgradeScene],
});
