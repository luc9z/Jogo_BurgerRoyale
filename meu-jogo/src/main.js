// ═══════════════════════════════════════════════════════════
//  main.js — entry point
// ═══════════════════════════════════════════════════════════
import Phaser    from 'phaser';
import { GAME }  from './constants.js';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width:  GAME.WIDTH,
  height: GAME.HEIGHT,
  parent: 'game',
  backgroundColor: '#08000d',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
