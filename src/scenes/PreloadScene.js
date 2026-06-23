import Phaser from 'phaser';
import { GAME, SHEET, KING_FRAMES, CLOWN_FRAMES } from '../constants.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'PreloadScene' }); }

  preload() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;

    // ── Fundo da tela de loading ─────────────────────────
    this.add.rectangle(W/2, H/2, W, H, 0x08000d);

    this.add.text(W/2, H/2 - 80, 'BURGER ROYALE', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffd740',
    }).setOrigin(0.5);

    this.add.text(W/2, H/2 - 44, 'CLOWN APOCALYPSE', {
      fontFamily: 'monospace', fontSize: '14px', color: '#cc3300',
    }).setOrigin(0.5);

    // Barra de loading
    const barBg = this.add.rectangle(W/2, H/2 + 10, 324, 18, 0x1a0008)
      .setStrokeStyle(2, 0x8b1a00);
    const bar = this.add.rectangle(W/2 - 160, H/2 + 10, 0, 14, 0xd4a000)
      .setOrigin(0, 0.5);
    const pct = this.add.text(W/2, H/2 + 36, 'Carregando...', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff8800',
    }).setOrigin(0.5);

    this.load.on('progress', v => {
      bar.width = 320 * v;
      pct.setText(Math.floor(v * 100) + '%');
    });

    this.load.on('loaderror', file => {
      console.error('LOAD ERROR:', file.key, file.src);
      pct.setText('Erro: ' + file.key);
    });

    // Assets
    this.load.spritesheet('king',  'assets/sprites/king.png',  {
      frameWidth: SHEET.FRAME_W, frameHeight: SHEET.FRAME_H,
    });
    this.load.spritesheet('clown', 'assets/sprites/clown.png', {
      frameWidth: SHEET.FRAME_W, frameHeight: SHEET.FRAME_H,
    });
    this.load.image('background', 'assets/sprites/background.png');
    this.load.svg('wicon-pistol',     'assets/icons/pistol.svg',     { width: 56, height: 56 });
    this.load.svg('wicon-shotgun',    'assets/icons/shotgun.svg',    { width: 56, height: 56 });
    this.load.svg('wicon-machinegun', 'assets/icons/machinegun.svg', { width: 56, height: 56 });
  }

  create() {
    console.log('PreloadScene.create() — assets loaded');

    // Verifica se carregou
    const kingOk  = this.textures.exists('king');
    const clownOk = this.textures.exists('clown');
    const bgOk    = this.textures.exists('background');
    console.log('king:', kingOk, 'clown:', clownOk, 'bg:', bgOk);

    if (!kingOk || !clownOk) {
      console.warn('Sprites não carregaram, criando fallback...');
      this._makeFallback();
    }

    this._makeAnims();

    // Inicia o jogo
    this.scene.start('GameScene');
  }

  _makeFallback() {
    const FW = SHEET.FRAME_W, FH = SHEET.FRAME_H;
    const COLS = 7, ROWS = 7;

    // ── Rei ───────────────────────────────────────────────
    if (!this.textures.exists('king')) {
      const rt = this.add.renderTexture(0, 0, FW * COLS, FH * ROWS);
      const g  = this.add.graphics();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 1; col < COLS; col++) {
          const bx = col * FW, by = row * FH;
          // coroa
          g.fillStyle(0xffd740); g.fillRect(bx+20, by+6,  36, 12);
          g.fillStyle(0xff2200); g.fillCircle(bx+22, by+4, 4);
          g.fillStyle(0xff2200); g.fillCircle(bx+38, by+4, 4);
          g.fillStyle(0xff2200); g.fillCircle(bx+54, by+4, 4);
          // cabeça
          g.fillStyle(0xf5c890); g.fillRect(bx+22, by+16, 32, 30);
          // olhos
          g.fillStyle(0x000000); g.fillRect(bx+28,by+22,6,6);
          g.fillRect(bx+42,by+22,6,6);
          // barba
          g.fillStyle(0x3b1a00); g.fillRect(bx+22, by+38, 32, 10);
          // corpo
          g.fillStyle(0xd4a000); g.fillRect(bx+16, by+48, 44, 50);
          // escudo
          g.fillStyle(0x3366cc); g.fillRect(bx+10, by+52, 16, 22);
          // pernas
          g.fillStyle(0x5a1000);
          g.fillRect(bx+18, by+96, 14, 20);
          g.fillRect(bx+44, by+96, 14, 20);
        }
      }
      rt.draw(g, 0, 0); rt.saveTexture('king');
      g.destroy(); rt.destroy();
    }

    // ── Palhaço ───────────────────────────────────────────
    if (!this.textures.exists('clown')) {
      const rt = this.add.renderTexture(0, 0, FW * COLS, FH * ROWS);
      const g  = this.add.graphics();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 1; col < COLS; col++) {
          const bx = col * FW, by = row * FH;
          // cabelo vermelho
          g.fillStyle(0xcc1100); g.fillRect(bx+12, by+0, 52, 22);
          g.fillRect(bx+8,  by+4, 12, 14);
          g.fillRect(bx+56, by+4, 12, 14);
          // rosto
          g.fillStyle(0xffffff); g.fillRect(bx+16, by+18, 44, 34);
          // olhos verdes
          g.fillStyle(0x228800);
          g.fillRect(bx+22, by+24, 8, 10);
          g.fillRect(bx+46, by+24, 8, 10);
          // nariz
          g.fillStyle(0xff0000); g.fillCircle(bx+38, by+32, 6);
          // boca
          g.fillStyle(0xff0000); g.fillRect(bx+22, by+44, 32, 5);
          // corpo amarelo
          g.fillStyle(0xddaa00); g.fillRect(bx+14, by+50, 48, 52);
          // gravata vermelha
          g.fillStyle(0xcc1100); g.fillRect(bx+34, by+52, 8, 24);
          // pernas
          g.fillStyle(0x3b1a00);
          g.fillRect(bx+16, by+100, 16, 18);
          g.fillRect(bx+44, by+100, 16, 18);
        }
      }
      rt.draw(g, 0, 0); rt.saveTexture('clown');
      g.destroy(); rt.destroy();
    }

    // ── Background ────────────────────────────────────────
    if (!this.textures.exists('background')) {
      const rt = this.add.renderTexture(0, 0, GAME.WIDTH, GAME.HEIGHT);
      const g  = this.add.graphics();
      g.fillStyle(0x12080a); g.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);
      g.lineStyle(1, 0x1e0e10);
      for (let x = 0; x < GAME.WIDTH; x += 40)  g.lineBetween(x,0,x,GAME.HEIGHT);
      for (let y = 0; y < GAME.HEIGHT; y += 20) g.lineBetween(0,y,GAME.WIDTH,y);
      rt.draw(g, 0, 0); rt.saveTexture('background');
      g.destroy(); rt.destroy();
    }
  }

  _makeAnims() {
    const a  = this.anims;
    const mk = cfg => { if (!a.exists(cfg.key)) a.create(cfg); };

    const kingTotal  = this.textures.get('king').frameTotal  - 1;
    const clownTotal = this.textures.get('clown').frameTotal - 1;

    const kf = arr => arr.filter(f => f < kingTotal);
    const cf = arr => arr.filter(f => f < clownTotal);
    const safe = (arr, fb) => (arr.length ? arr : fb);

    mk({ key:'king-idle',    frames: a.generateFrameNumbers('king',  { frames: safe(kf(KING_FRAMES.IDLE),   [0]) }), frameRate:4,  repeat:-1 });
    mk({ key:'king-walk',    frames: a.generateFrameNumbers('king',  { frames: safe(kf(KING_FRAMES.WALK),   [0]) }), frameRate:8,  repeat:-1 });
    mk({ key:'king-run',     frames: a.generateFrameNumbers('king',  { frames: safe(kf(KING_FRAMES.RUN),    [0]) }), frameRate:10, repeat:-1 });
    mk({ key:'king-attack',  frames: a.generateFrameNumbers('king',  { frames: safe(kf(KING_FRAMES.ATTACK), [0]) }), frameRate:12, repeat:0  });
    mk({ key:'king-hurt',    frames: a.generateFrameNumbers('king',  { frames: safe(kf(KING_FRAMES.HURT),   [0]) }), frameRate:10, repeat:0  });
    mk({ key:'king-victory', frames: a.generateFrameNumbers('king',  { frames: safe(kf(KING_FRAMES.VICTORY),[0]) }), frameRate:6,  repeat:-1 });

    mk({ key:'clown-idle',   frames: a.generateFrameNumbers('clown', { frames: safe(cf(CLOWN_FRAMES.IDLE),  [0]) }), frameRate:5,  repeat:-1 });
    mk({ key:'clown-walk',   frames: a.generateFrameNumbers('clown', { frames: safe(cf(CLOWN_FRAMES.WALK),  [0]) }), frameRate:8,  repeat:-1 });
    mk({ key:'clown-attack', frames: a.generateFrameNumbers('clown', { frames: safe(cf(CLOWN_FRAMES.ATTACK),[0]) }), frameRate:10, repeat:0  });
    mk({ key:'clown-hurt',   frames: a.generateFrameNumbers('clown', { frames: safe(cf(CLOWN_FRAMES.HURT),  [0]) }), frameRate:10, repeat:0  });
    mk({ key:'clown-death',  frames: a.generateFrameNumbers('clown', { frames: safe(cf(CLOWN_FRAMES.DEATH), [0]) }), frameRate:7,  repeat:0  });
  }
}
