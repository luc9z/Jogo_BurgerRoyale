import Phaser from 'phaser';
import {
  GAME, ARENA, COLOR, DEPTH, EVT,
  KING_SHEET, CLOWN_SHEET, KING_ANIM, CLOWN_ANIM,
} from '../constants.js';
import Player       from '../entities/Player.js';
import EnemyManager from '../systems/EnemyManager.js';
import HUD          from '../ui/HUD.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ── PRELOAD ──────────────────────────────────────────────
  preload() {
    const { WIDTH: W, HEIGHT: H } = GAME;
    this.add.rectangle(W/2, H/2, W, H, 0x08000d);
    this.add.text(W/2, H/2 - 36, 'BURGER ROYALE', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '20px', color: '#ffd740',
    }).setOrigin(0.5);
    this.add.text(W/2, H/2 - 4, 'CLOWN APOCALYPSE', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#cc3300',
    }).setOrigin(0.5);

    this.add.rectangle(W/2, H/2 + 28, 304, 16, 0x1a0008).setStrokeStyle(2, 0x8b1a00);
    const bar = this.add.rectangle(W/2 - 150, H/2 + 28, 0, 12, 0xd4a000).setOrigin(0, 0.5);
    const pct = this.add.text(W/2, H/2 + 50, '0%', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#ff8800',
    }).setOrigin(0.5);

    this.load.on('progress', v => { bar.width = 300 * v; pct.setText(Math.floor(v*100)+'%'); });
    this.load.on('loaderror', f => console.error('Load error:', f.key, f.src));

    this.load.spritesheet('king',  'assets/sprites/king.png',
      { frameWidth: KING_SHEET.FW,  frameHeight: KING_SHEET.FH  });
    this.load.spritesheet('clown', 'assets/sprites/clown.png',
      { frameWidth: CLOWN_SHEET.FW, frameHeight: CLOWN_SHEET.FH });
    this.load.image('background', 'assets/sprites/background.png');
  }

  // ── CREATE ───────────────────────────────────────────────
  create() {
    this.score        = 0;
    this.isGameOver   = false;
    this._roundEnding = false;
    this._goShown     = false;

    this._createAnims();
    this._buildMap();

    this.hud     = new HUD(this);
    this.player  = new Player(this);
    this.enemies = new EnemyManager(this);

    this.events.on(EVT.ENEMY_KILLED, pts => {
      this.score += pts;
      this.events.emit('score-changed', this.score);
    });
    this.events.on(EVT.PLAYER_DEAD, () => this._gameOver());

    this.enemies.startRound();
  }

  // ── UPDATE ───────────────────────────────────────────────
  update(_t, delta) {
    if (this.isGameOver) return;
    this.player.update(delta);
    this.enemies.update(this.player.x, this.player.y);
    this.enemies.checkBulletHits(this.player.bullets.getChildren());
    this.enemies.applyContactDamage(this.player, delta);
    this.hud.update(this.player.ammo, this.enemies.aliveCount);

    if (!this._roundEnding && this.enemies.isRoundComplete()) {
      this._roundEnding = true;
      this.enemies.endRound();
      this.player.reloadFull();
      this.hud.showRoundClear(this.enemies.round);
      this.time.delayedCall(3500, () => {
        this._roundEnding = false;
        this.enemies.startRound();
      });
    }
  }

  // ── ANIMAÇÕES ────────────────────────────────────────────
  _createAnims() {
    const a  = this.anims;
    const mk = cfg => { if (!a.exists(cfg.key)) a.create(cfg); };
    const kTotal = this.textures.get('king').frameTotal  - 1;
    const cTotal = this.textures.get('clown').frameTotal - 1;

    // Gera frames e filtra os que existem
    const kFrames = (s, e) => {
      const f = [];
      for (let i = s; i <= Math.min(e, kTotal-1); i++) f.push(i);
      return f.length ? f : [0];
    };
    const cFrames = (s, e) => {
      const f = [];
      for (let i = s; i <= Math.min(e, cTotal-1); i++) f.push(i);
      return f.length ? f : [0];
    };

    // ── Rei ────────────────────────────────────────────────
    mk({ key: 'king-idle',
      frames: a.generateFrameNumbers('king', { frames: kFrames(KING_ANIM.IDLE.start,   KING_ANIM.IDLE.end)   }),
      frameRate: 4, repeat: -1 });
    mk({ key: 'king-walk',
      frames: a.generateFrameNumbers('king', { frames: kFrames(KING_ANIM.WALK.start,   KING_ANIM.WALK.end)   }),
      frameRate: 8, repeat: -1 });
    mk({ key: 'king-attack',
      frames: a.generateFrameNumbers('king', { frames: kFrames(KING_ANIM.ATTACK.start, KING_ANIM.ATTACK.end) }),
      frameRate: 12, repeat: 0 });

    // ── Palhaço ────────────────────────────────────────────
    mk({ key: 'clown-idle',
      frames: a.generateFrameNumbers('clown', { frames: cFrames(CLOWN_ANIM.IDLE.start,   CLOWN_ANIM.IDLE.end)   }),
      frameRate: 5, repeat: -1 });
    mk({ key: 'clown-walk',
      frames: a.generateFrameNumbers('clown', { frames: cFrames(CLOWN_ANIM.WALK.start,   CLOWN_ANIM.WALK.end)   }),
      frameRate: 8, repeat: -1 });
    mk({ key: 'clown-attack',
      frames: a.generateFrameNumbers('clown', { frames: cFrames(CLOWN_ANIM.ATTACK.start, CLOWN_ANIM.ATTACK.end) }),
      frameRate: 10, repeat: 0 });
    mk({ key: 'clown-hurt',
      frames: a.generateFrameNumbers('clown', { frames: cFrames(CLOWN_ANIM.HURT.start,   CLOWN_ANIM.HURT.end)   }),
      frameRate: 10, repeat: 0 });
    mk({ key: 'clown-death',
      frames: a.generateFrameNumbers('clown', { frames: cFrames(CLOWN_ANIM.DEATH.start,  CLOWN_ANIM.DEATH.end)  }),
      frameRate: 8, repeat: 0 });
  }

  // ── MAPA ─────────────────────────────────────────────────
  _buildMap() {
    const { WIDTH: W, HEIGHT: H } = GAME;
    this.add.image(W/2, H/2, 'background').setDisplaySize(W, H).setDepth(DEPTH.BG);
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.38).setDepth(DEPTH.BG+1);
    this.physics.world.setBounds(ARENA.X, ARENA.Y, ARENA.W, ARENA.H);

    const g = this.add.graphics().setDepth(DEPTH.BORDER);
    g.lineStyle(4, COLOR.WALL, 0.9);
    g.strokeRect(ARENA.X, ARENA.Y, ARENA.W, ARENA.H);
    g.lineStyle(1, COLOR.GOLD, 0.4);
    g.strokeRect(ARENA.X+4, ARENA.Y+4, ARENA.W-8, ARENA.H-8);
    g.lineStyle(3, COLOR.GOLD_LIGHT, 1);
    const cs = [
      [ARENA.X,           ARENA.Y,            1,  1],
      [ARENA.X+ARENA.W,   ARENA.Y,           -1,  1],
      [ARENA.X,           ARENA.Y+ARENA.H,    1, -1],
      [ARENA.X+ARENA.W,   ARENA.Y+ARENA.H,   -1, -1],
    ];
    for (const [cx, cy, dx, dy] of cs) {
      g.lineBetween(cx, cy, cx+dx*22, cy);
      g.lineBetween(cx, cy, cx, cy+dy*22);
      g.fillStyle(COLOR.GOLD_LIGHT, 1);
      g.fillRect(cx-3, cy-3, 6, 6);
    }
  }

  // ── GAME OVER ────────────────────────────────────────────
  _gameOver() {
    if (this._goShown) return;
    this._goShown = true;
    this.isGameOver = true;
    this.physics.pause();

    const { WIDTH: W, HEIGHT: H } = GAME;
    const D = DEPTH.OVERLAY;

    const ov = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0).setDepth(D);
    this.tweens.add({ targets: ov, fillAlpha: 0.82, duration: 700 });

    this.time.delayedCall(450, () => {
      const ps = (sz, col) => ({
        fontFamily: '"Press Start 2P", monospace', fontSize: sz, color: col,
        stroke: '#000', strokeThickness: 5,
      });

      this.add.text(W/2, H/2-90, 'GAME OVER',          ps('36px','#ff2200')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-38, 'Os palhaços venceram...', ps('10px','#ffaa00')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2+0,  `Pontuação: ${this.score.toLocaleString('pt-BR')}`, ps('11px','#ffd740')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2+30, `Rounds: ${this.enemies.round}`, ps('9px','#ff8800')).setOrigin(0.5).setDepth(D+1);

      const btn = this.add.rectangle(W/2, H/2+86, 250, 38, COLOR.WALL)
        .setStrokeStyle(2, COLOR.WALL_GLOW).setDepth(D+1)
        .setInteractive({ useHandCursor: true });
      this.add.text(W/2, H/2+86, 'JOGAR NOVAMENTE', ps('9px','#ffffff')).setOrigin(0.5).setDepth(D+2);
      btn.on('pointerover', () => btn.setFillStyle(0xcc2200));
      btn.on('pointerout',  () => btn.setFillStyle(COLOR.WALL));
      btn.on('pointerdown', () => this.scene.restart());
    });
  }
}
