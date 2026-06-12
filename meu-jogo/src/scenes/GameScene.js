import Phaser from 'phaser';
import {
  GAME, ARENA, COLOR, DEPTH, EVT, WEAPONS, PLAYER,
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

    // Carregado em 2× resolução → scale 0.65 mantém tamanho visual igual, qualidade dobrada
    const kSz = { width: 120, height: 180 };
    const cSz = { width: 120, height: 180 };
    const dSz = { width: 180, height: 110 };

    this.load.svg('king-frame-idle',     'assets/sprites/king-idle.svg',     kSz);
    this.load.svg('king-frame-walk-a',   'assets/sprites/king-walk-a.svg',   kSz);
    this.load.svg('king-frame-walk-b',   'assets/sprites/king-walk-b.svg',   kSz);
    this.load.svg('king-frame-attack',   'assets/sprites/king-attack.svg',   { width: 140, height: 180 });
    this.load.svg('king-frame-hurt',     'assets/sprites/king-hurt.svg',     kSz);
    this.load.svg('king-frame-dead',     'assets/sprites/king-dead.svg',     dSz);

    this.load.svg('clown-frame-idle',    'assets/sprites/clown-idle.svg',    cSz);
    this.load.svg('clown-frame-walk-a',  'assets/sprites/clown-walk-a.svg',  cSz);
    this.load.svg('clown-frame-walk-b',  'assets/sprites/clown-walk-b.svg',  cSz);
    this.load.svg('clown-frame-attack',  'assets/sprites/clown-attack.svg',  { width: 140, height: 180 });
    this.load.svg('clown-frame-hurt',    'assets/sprites/clown-hurt.svg',    cSz);
    this.load.svg('clown-frame-dead',    'assets/sprites/clown-dead.svg',    dSz);

    this.load.image('background', 'assets/sprites/background.png');

    this.load.audio('sfx-shoot',        'assets/audio/shoot.mp3');
    this.load.audio('sfx-reload',       'assets/audio/reload.mp3');
    this.load.audio('sfx-player-hurt',  'assets/audio/player-hurt.mp3');
    this.load.audio('sfx-player-death', 'assets/audio/player-death.mp3');
    this.load.audio('sfx-clown-hit',    'assets/audio/clown-hit.mp3');
    this.load.audio('sfx-clown-laugh',  'assets/audio/clown-laugh.mp3');
  }

  // ── CREATE ───────────────────────────────────────────────
  create() {
    this.score            = 0;
    this.isGameOver       = false;
    this._roundEnding     = false;
    this._goShown         = false;
    this._paused          = false;
    this._pendingNextRound = false;
    this._pickups         = [];

    this._makeBulletTexture();
    this._createAnims();
    this._buildMap();

    this.hud     = new HUD(this);
    this.player  = new Player(this);
    this.enemies = new EnemyManager(this);

    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.events.on('resume', () => {
      this._paused = false;
      if (this._pendingNextRound) {
        this._pendingNextRound = false;
        this._roundEnding      = false;
        this.enemies.startRound();
      }
    });

    this.events.on(EVT.ENEMY_KILLED, pts => {
      this.score += pts;
      this.events.emit('score-changed', this.score);
    });
    this.events.on(EVT.PLAYER_DEAD, () => this._gameOver());

    this._setupPickups();
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
    this.enemies.applyContactDamage(this.player);
    this.hud.update(this.player.ammo, this.enemies.aliveCount);

    this._checkPickups();

    if (!this._roundEnding && this.enemies.isRoundComplete()) {
      this._roundEnding      = true;
      this._pendingNextRound = true;
      this.enemies.endRound();
      this.player.reloadFull();
      this.hud.showRoundClear(this.enemies.round);

      this.time.delayedCall(1800, () => {
        if (this.isGameOver || this._paused) return;
        this._paused = true;
        this.scene.pause();
        this.scene.launch('UpgradeScene', {
          score:         this.score,
          round:         this.enemies.round,
          hearts:        this.player.hearts,
          currentWeapon: this.player.weaponKey,
        });
      });
    }
  }

  // Chamado pelo UpgradeScene antes de resumir
  applyUpgrade(upgrade) {
    if (!upgrade) return;
    switch (upgrade.key) {
      case 'heal':   this.player.heal(); break;
      case 'speed':  this.player.addSpeedBonus(25); break;
      case 'damage': this.player.addDamageBonus(0.20); break;
      case 'reload': this.player.addReloadBonus(0.25); break;
      default:
        if (upgrade.key in WEAPONS) this.player.changeWeapon(upgrade.key);
    }
    if (upgrade.cost > 0) {
      this.score = Math.max(0, this.score - upgrade.cost);
      this.events.emit('score-changed', this.score);
    }
  }

  // ── PICKUPS DE CURA ──────────────────────────────────────
  _setupPickups() {
    this.events.on('drop-heal', (x, y) => {
      const g = this.add.graphics().setDepth(DEPTH.FX);
      g.fillStyle(0xff2244, 1);
      g.fillRect(-7, -2, 14, 4);
      g.fillRect(-2, -7, 4, 14);
      g.lineStyle(1, 0xff8888, 0.6);
      g.strokeRect(-7, -2, 14, 4);
      g.setPosition(x, y);
      this.tweens.add({
        targets: g, scaleX: 1.3, scaleY: 1.3,
        duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      const pickup = { g, x, y };
      this._pickups.push(pickup);
      this.time.delayedCall(9000, () => {
        const i = this._pickups.indexOf(pickup);
        if (i >= 0) { this._pickups.splice(i, 1); g.destroy(); }
      });
    });

    this.events.on('show-boss-warning', () => {
      const { WIDTH: W, HEIGHT: H } = GAME;
      const lbl = this.add.text(W/2, H/2 - 72, '⚠  CHEFE CHEGANDO!  ⚠', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '18px', color: '#ff0000',
        stroke: '#000', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(DEPTH.BANNER + 1).setAlpha(0);
      this.tweens.add({
        targets: lbl, alpha: 1, duration: 220, yoyo: true, repeat: 5,
        onComplete: () => lbl.destroy(),
      });
    });
  }

  _checkPickups() {
    for (let i = this._pickups.length - 1; i >= 0; i--) {
      const p = this._pickups[i];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 32) {
        this.player.heal();
        p.g.destroy();
        this._pickups.splice(i, 1);
      }
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
    const f1 = k       => [{ key: k }];
    const f2 = (ka,kb) => [{ key: ka }, { key: kb }];

    for (const king of ['king-default', 'king-gold', 'king-silver']) {
      mk({ key: `${king}-idle`,   frames: f1('king-frame-idle'),                        frameRate: 4,  repeat: -1 });
      mk({ key: `${king}-walk`,   frames: f2('king-frame-walk-a','king-frame-walk-b'),  frameRate: 8,  repeat: -1 });
      mk({ key: `${king}-attack`, frames: f1('king-frame-attack'),                      frameRate: 14, repeat: 0  });
      mk({ key: `${king}-hurt`,   frames: f1('king-frame-hurt'),                        frameRate: 10, repeat: 0  });
      mk({ key: `${king}-death`,  frames: f1('king-frame-dead'),                        frameRate: 7,  repeat: 0  });
    }

    for (const clown of ['clown', 'clown-fat', 'clown-skinny']) {
      mk({ key: `${clown}-idle`,   frames: f1('clown-frame-idle'),                         frameRate: 5,  repeat: -1 });
      mk({ key: `${clown}-walk`,   frames: f2('clown-frame-walk-a','clown-frame-walk-b'),  frameRate: 8,  repeat: -1 });
      mk({ key: `${clown}-attack`, frames: f1('clown-frame-attack'),                       frameRate: 10, repeat: 0  });
      mk({ key: `${clown}-hurt`,   frames: f1('clown-frame-hurt'),                         frameRate: 10, repeat: 0  });
      mk({ key: `${clown}-death`,  frames: f1('clown-frame-dead'),                         frameRate: 7,  repeat: 0  });
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
    this._goShown   = true;
    this.isGameOver = true;
    this.physics.pause();

    // Restaura cursor (estava oculto pelo crosshair)
    this.input.setDefaultCursor('default');

    const prev  = parseInt(localStorage.getItem('burgerRoyale_best') || '0');
    const isNew = this.score > prev;
    if (isNew) localStorage.setItem('burgerRoyale_best', String(this.score));

    const { WIDTH: W, HEIGHT: H } = GAME;
    const D = DEPTH.OVERLAY;

    const ov = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0).setDepth(D);
    this.tweens.add({ targets: ov, fillAlpha: 0.84, duration: 700 });

    this.time.delayedCall(450, () => {
      const ps = (sz, col) => ({
        fontFamily: '"Press Start 2P", monospace', fontSize: sz, color: col,
        stroke: '#000', strokeThickness: 6,
      });

      this.add.text(W/2, H/2-110, 'GAME OVER',               ps('38px','#ff2200')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-60,  'Os palhaços venceram...', ps('10px','#ffaa00')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-26,  `Pontuação: ${this.score.toLocaleString('pt-BR')}`, ps('12px','#ffd740')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2+8,   `Rounds: ${this.enemies.round}`, ps('10px','#ff8800')).setOrigin(0.5).setDepth(D+1);
      if (isNew) {
        this.add.text(W/2, H/2+38, '✦ NOVO RECORDE! ✦', ps('9px','#ffd740')).setOrigin(0.5).setDepth(D+1);
      }

      const mkBtn = (y, label, col, onClick) => {
        const btn = this.add.rectangle(W/2, y, 280, 44, 0x0c000f)
          .setStrokeStyle(2, col).setDepth(D+1)
          .setInteractive({ useHandCursor: true });
        const txt = this.add.text(W/2, y, label, ps('10px', '#ffffff')).setOrigin(0.5).setDepth(D+2);
        btn.on('pointerover', () => { btn.setFillStyle(0x1a001a); this.tweens.add({ targets:[btn,txt], scaleX:1.05, scaleY:1.05, duration:60 }); });
        btn.on('pointerout',  () => { btn.setFillStyle(0x0c000f); this.tweens.add({ targets:[btn,txt], scaleX:1,    scaleY:1,    duration:60 }); });
        btn.on('pointerdown', onClick);
      };

      mkBtn(H/2 + 86,  'JOGAR NOVAMENTE', COLOR.WALL_GLOW, () => {
        this.scene.start('GameScene');
      });
      mkBtn(H/2 + 140, 'MENU PRINCIPAL',  0x555555, () => {
        this.scene.start('MenuScene');
      });
    });
  }
}
