import Phaser from 'phaser';
import {
  GAME, ARENA, COLOR, DEPTH, EVT, MYSTERY_BOX,
  SHEET, KING_FRAMES, CLOWN_FRAMES,
} from '../constants.js';
import Player       from '../entities/Player.js';
import EnemyManager from '../systems/EnemyManager.js';
import MysteryBox   from '../systems/MysteryBox.js';
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

    const cfg = { frameWidth: SHEET.FW, frameHeight: SHEET.FH };

    // Rei (jogador) — 3 variantes
    this.load.spritesheet('king-default', 'assets/sprites/king-default.png', cfg);
    this.load.spritesheet('king-gold',    'assets/sprites/king-gold.png',    cfg);
    this.load.spritesheet('king-silver',  'assets/sprites/king-silver.png',  cfg);

    // Palhaços (inimigos) — 3 variantes
    this.load.spritesheet('clown',        'assets/sprites/clown.png',        cfg);
    this.load.spritesheet('clown-fat',    'assets/sprites/clown-fat.png',    cfg);
    this.load.spritesheet('clown-skinny', 'assets/sprites/clown-skinny.png', cfg);

    this.load.image('background', 'assets/sprites/background.png');

    // ── Áudio ────────────────────────────────────────────
    this.load.audio('sfx-shoot',        'assets/audio/shoot.mp3');
    this.load.audio('sfx-reload',       'assets/audio/reload.mp3');
    this.load.audio('sfx-player-hurt',  'assets/audio/player-hurt.mp3');
    this.load.audio('sfx-player-death', 'assets/audio/player-death.mp3');
    this.load.audio('sfx-clown-hit',    'assets/audio/clown-hit.mp3');
    this.load.audio('sfx-clown-laugh',  'assets/audio/clown-laugh.mp3');
  }

  // ── CREATE ───────────────────────────────────────────────
  create() {
    this.score        = 0;
    this.isGameOver   = false;
    this._roundEnding = false;
    this._goShown     = false;
    this._paused      = false;

    this._makeBulletTexture();
    this._createAnims();
    this._buildMap();

    this.hud        = new HUD(this);
    this.player     = new Player(this);
    this.enemies    = new EnemyManager(this);
    this.mysteryBox = new MysteryBox(this);

    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Quando PauseScene chama scene.resume(), reseta o flag de pause
    this.events.on('resume', () => { this._paused = false; });

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

    if (Phaser.Input.Keyboard.JustDown(this._escKey) && !this._paused) {
      this._paused = true;
      this.scene.pause();
      this.scene.launch('PauseScene', {
        score:  this.score,
        round:  this.enemies.round,
        weapon: this.player.weaponDef.name,
      });
      return;
    }

    this.player.update(delta);
    this.enemies.update(this.player.x, this.player.y);
    this.enemies.checkBulletHits(this.player.bullets.getChildren());
    this.enemies.applyContactDamage(this.player, delta);
    this.hud.update(this.player.ammo, this.enemies.aliveCount);

    const weapon = this.mysteryBox.update(this.player.x, this.player.y, this.score);
    if (weapon) {
      this.score = Math.max(0, this.score - MYSTERY_BOX.COST);
      this.events.emit('score-changed', this.score);
      this.player.equipWeapon(weapon);
    }

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

  // ── TEXTURA DE BALA ─────────────────────────────────────
  _makeBulletTexture() {
    if (this.textures.exists('bullet')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffe060, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(4, 4, 2);
    g.generateTexture('bullet', 12, 12);
    g.destroy();
  }

  // ── ANIMAÇÕES ────────────────────────────────────────────
  _createAnims() {
    const a  = this.anims;
    const mk = cfg => { if (!a.exists(cfg.key)) a.create(cfg); };

    const frames = (key, arr) => a.generateFrameNumbers(key, { frames: arr });

    // ── Rei (todas variantes compartilham os mesmos índices) ──
    for (const king of ['king-default', 'king-gold', 'king-silver']) {
      mk({ key: `${king}-idle`,   frames: frames(king, KING_FRAMES.IDLE),   frameRate: 4,  repeat: -1 });
      mk({ key: `${king}-walk`,   frames: frames(king, KING_FRAMES.WALK),   frameRate: 8,  repeat: -1 });
      mk({ key: `${king}-attack`, frames: frames(king, KING_FRAMES.ATTACK), frameRate: 14, repeat: 0  });
      mk({ key: `${king}-hurt`,   frames: frames(king, KING_FRAMES.HURT),   frameRate: 10, repeat: 0  });
      mk({ key: `${king}-death`,  frames: frames(king, KING_FRAMES.DEATH),  frameRate: 7,  repeat: 0  });
    }

    // ── Palhaços (todas variantes compartilham os mesmos índices) ──
    for (const clown of ['clown', 'clown-fat', 'clown-skinny']) {
      mk({ key: `${clown}-idle`,   frames: frames(clown, CLOWN_FRAMES.IDLE),   frameRate: 5,  repeat: -1 });
      mk({ key: `${clown}-walk`,   frames: frames(clown, CLOWN_FRAMES.WALK),   frameRate: 8,  repeat: -1 });
      mk({ key: `${clown}-attack`, frames: frames(clown, CLOWN_FRAMES.ATTACK), frameRate: 10, repeat: 0  });
      mk({ key: `${clown}-hurt`,   frames: frames(clown, CLOWN_FRAMES.HURT),   frameRate: 10, repeat: 0  });
      mk({ key: `${clown}-death`,  frames: frames(clown, CLOWN_FRAMES.DEATH),  frameRate: 7,  repeat: 0  });
    }
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

    // Salva melhor pontuação
    const prev = parseInt(localStorage.getItem('burgerRoyale_best') || '0');
    const isNew = this.score > prev;
    if (isNew) localStorage.setItem('burgerRoyale_best', String(this.score));

    const { WIDTH: W, HEIGHT: H } = GAME;
    const D = DEPTH.OVERLAY;

    const ov = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0).setDepth(D);
    this.tweens.add({ targets: ov, fillAlpha: 0.82, duration: 700 });

    this.time.delayedCall(450, () => {
      const ps = (sz, col) => ({
        fontFamily: '"Press Start 2P", monospace', fontSize: sz, color: col,
        stroke: '#000', strokeThickness: 5,
      });

      this.add.text(W/2, H/2-100, 'GAME OVER',               ps('36px','#ff2200')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-50,  'Os palhaços venceram...', ps('10px','#ffaa00')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-16,  `Pontuação: ${this.score.toLocaleString('pt-BR')}`, ps('11px','#ffd740')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2+14,  `Rounds: ${this.enemies.round}`, ps('9px','#ff8800')).setOrigin(0.5).setDepth(D+1);

      if (isNew) {
        this.add.text(W/2, H/2+38, 'NOVO RECORDE!', ps('8px','#ffd740')).setOrigin(0.5).setDepth(D+1);
      }

      // Botão: Jogar novamente
      const btnPlay = this.add.rectangle(W/2, H/2 + 80, 250, 38, COLOR.WALL)
        .setStrokeStyle(2, COLOR.WALL_GLOW).setDepth(D+1)
        .setInteractive({ useHandCursor: true });
      this.add.text(W/2, H/2+80, 'JOGAR NOVAMENTE', ps('9px','#ffffff')).setOrigin(0.5).setDepth(D+2);
      btnPlay.on('pointerover', () => btnPlay.setFillStyle(0xcc2200));
      btnPlay.on('pointerout',  () => btnPlay.setFillStyle(COLOR.WALL));
      btnPlay.on('pointerdown', () => this.scene.restart());

      // Botão: Menu principal
      const btnMenu = this.add.rectangle(W/2, H/2 + 128, 250, 38, 0x0c000f)
        .setStrokeStyle(2, 0x444444).setDepth(D+1)
        .setInteractive({ useHandCursor: true });
      this.add.text(W/2, H/2+128, 'MENU PRINCIPAL', ps('9px','#aaaaaa')).setOrigin(0.5).setDepth(D+2);
      btnMenu.on('pointerover', () => btnMenu.setFillStyle(0x1a001a));
      btnMenu.on('pointerout',  () => btnMenu.setFillStyle(0x0c000f));
      btnMenu.on('pointerdown', () => this.scene.start('MenuScene'));
    });
  }
}
