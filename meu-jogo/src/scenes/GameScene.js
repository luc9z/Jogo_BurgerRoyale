// ═══════════════════════════════════════════════════════════
//  GameScene — única cena: carrega assets + roda o jogo
// ═══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import {
  GAME, ARENA, COLOR, DEPTH, EVT,
  SHEET, KING_FRAMES, CLOWN_FRAMES,
} from '../constants.js';
import Player        from '../entities/Player.js';
import EnemyManager  from '../systems/EnemyManager.js';
import HUD           from '../ui/HUD.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ── PRELOAD ──────────────────────────────────────────────
  preload() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;

    // Tela de loading
    this.add.rectangle(W/2, H/2, W, H, 0x08000d);
    this.add.text(W/2, H/2 - 40, 'BURGER ROYALE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px', color: '#ffd740',
    }).setOrigin(0.5);
    this.add.text(W/2, H/2 - 8, 'CLOWN APOCALYPSE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px', color: '#cc3300',
    }).setOrigin(0.5);

    this.add.rectangle(W/2, H/2 + 30, 304, 16, 0x1a0008)
      .setStrokeStyle(2, 0x8b1a00);
    const bar = this.add.rectangle(W/2 - 150, H/2 + 30, 0, 12, 0xd4a000)
      .setOrigin(0, 0.5);
    const pct = this.add.text(W/2, H/2 + 54, '0%', {
      fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#ff8800',
    }).setOrigin(0.5);

    this.load.on('progress', v => {
      bar.width = 300 * v;
      pct.setText(Math.floor(v * 100) + '%');
    });
    this.load.on('loaderror', file => {
      console.error('Erro ao carregar:', file.key, file.src);
    });

    // Assets
    this.load.spritesheet('king',  'assets/sprites/king.png',  {
      frameWidth: SHEET.FRAME_W, frameHeight: SHEET.FRAME_H,
    });
    this.load.spritesheet('clown', 'assets/sprites/clown.png', {
      frameWidth: SHEET.FRAME_W, frameHeight: SHEET.FRAME_H,
    });
    this.load.image('background', 'assets/sprites/background.png');
  }

  // ── CREATE ───────────────────────────────────────────────
  create() {
    // Estado da partida
    this.score        = 0;
    this.isGameOver   = false;
    this._roundEnding = false;
    this._goShown     = false;

    // 1. Animações
    this._createAnims();

    // 2. Mapa
    this._buildMap();

    // 3. HUD (precisa estar antes do player para escutar eventos)
    this.hud = new HUD(this);

    // 4. Player
    this.player = new Player(this);

    // 5. Inimigos
    this.enemies = new EnemyManager(this);

    // 6. Eventos globais
    this.events.on(EVT.ENEMY_KILLED, pts => {
      this.score += pts;
      this.events.emit('score-changed', this.score);
    });
    this.events.on(EVT.PLAYER_DEAD, () => this._gameOver());

    // 7. Inicia primeiro round
    this.enemies.startRound();
  }

  // ── UPDATE ───────────────────────────────────────────────
  update(_time, delta) {
    if (this.isGameOver) return;

    this.player.update(delta);
    this.enemies.update(this.player.x, this.player.y);

    // Colisão balas × inimigos
    const bullets = this.player.bullets.getChildren();
    this.enemies.checkBulletHits(bullets);

    // Dano de contato inimigo → player
    this.enemies.applyContactDamage(this.player, delta);

    // HUD
    this.hud.update(this.player.ammo, this.enemies.aliveCount);

    // Fim de round
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
    const a = this.anims;
    const mk = cfg => { if (!a.exists(cfg.key)) a.create(cfg); };

    const total = key => this.textures.get(key).frameTotal;
    const safe  = (key, frames) => {
      const t = total(key);
      const ok = frames.filter(f => f < t);
      return ok.length ? ok : [0];
    };

    // ── Rei ────────────────────────────────────────────────
    mk({ key:'king-idle',
      frames: a.generateFrameNumbers('king', { frames: safe('king', KING_FRAMES.IDLE) }),
      frameRate: 4, repeat: -1 });
    mk({ key:'king-walk',
      frames: a.generateFrameNumbers('king', { frames: safe('king', KING_FRAMES.WALK) }),
      frameRate: 8, repeat: -1 });
    mk({ key:'king-run',
      frames: a.generateFrameNumbers('king', { frames: safe('king', KING_FRAMES.RUN) }),
      frameRate: 10, repeat: -1 });
    mk({ key:'king-attack',
      frames: a.generateFrameNumbers('king', { frames: safe('king', KING_FRAMES.ATTACK) }),
      frameRate: 14, repeat: 0 });
    mk({ key:'king-hurt',
      frames: a.generateFrameNumbers('king', { frames: safe('king', KING_FRAMES.HURT) }),
      frameRate: 10, repeat: 0 });

    // ── Palhaço ────────────────────────────────────────────
    mk({ key:'clown-idle',
      frames: a.generateFrameNumbers('clown', { frames: safe('clown', CLOWN_FRAMES.IDLE) }),
      frameRate: 5, repeat: -1 });
    mk({ key:'clown-walk',
      frames: a.generateFrameNumbers('clown', { frames: safe('clown', CLOWN_FRAMES.WALK) }),
      frameRate: 8, repeat: -1 });
    mk({ key:'clown-attack',
      frames: a.generateFrameNumbers('clown', { frames: safe('clown', CLOWN_FRAMES.ATTACK) }),
      frameRate: 10, repeat: 0 });
    mk({ key:'clown-hurt',
      frames: a.generateFrameNumbers('clown', { frames: safe('clown', CLOWN_FRAMES.HURT) }),
      frameRate: 10, repeat: 0 });
    mk({ key:'clown-death',
      frames: a.generateFrameNumbers('clown', { frames: safe('clown', CLOWN_FRAMES.DEATH) }),
      frameRate: 8, repeat: 0 });
  }

  // ── MAPA ─────────────────────────────────────────────────
  _buildMap() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;

    this.add.image(W/2, H/2, 'background')
      .setDisplaySize(W, H)
      .setDepth(DEPTH.BG);

    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.4)
      .setDepth(DEPTH.BG + 1);

    this.physics.world.setBounds(ARENA.X, ARENA.Y, ARENA.W, ARENA.H);

    const g = this.add.graphics().setDepth(DEPTH.BORDER);
    g.lineStyle(4, COLOR.WALL, 0.9);
    g.strokeRect(ARENA.X, ARENA.Y, ARENA.W, ARENA.H);
    g.lineStyle(1, COLOR.GOLD, 0.4);
    g.strokeRect(ARENA.X+4, ARENA.Y+4, ARENA.W-8, ARENA.H-8);

    g.lineStyle(3, COLOR.GOLD_LIGHT, 1);
    const cs = [
      [ARENA.X,           ARENA.Y,            1,  1],
      [ARENA.X + ARENA.W, ARENA.Y,           -1,  1],
      [ARENA.X,           ARENA.Y + ARENA.H,  1, -1],
      [ARENA.X + ARENA.W, ARENA.Y + ARENA.H, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of cs) {
      g.lineBetween(cx, cy, cx + dx*22, cy);
      g.lineBetween(cx, cy, cx, cy + dy*22);
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

    const W = GAME.WIDTH, H = GAME.HEIGHT;

    const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0)
      .setDepth(DEPTH.OVERLAY);
    this.tweens.add({ targets: overlay, fillAlpha: 0.82, duration: 700 });

    this.time.delayedCall(450, () => {
      this.add.text(W/2, H/2 - 90, 'GAME OVER', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '36px', color: '#ff2200',
        stroke: '#000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 1);

      this.add.text(W/2, H/2 - 38, 'Os palhaços venceram...', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px', color: '#ffaa00',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 1);

      this.add.text(W/2, H/2,
        `Pontuação: ${this.score.toLocaleString('pt-BR')}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px', color: '#ffd740',
        stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 1);

      this.add.text(W/2, H/2 + 30,
        `Rounds: ${this.enemies.round}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px', color: '#ff8800',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 1);

      const btn = this.add.rectangle(W/2, H/2 + 86, 250, 38, COLOR.WALL)
        .setStrokeStyle(2, COLOR.WALL_GLOW)
        .setDepth(DEPTH.OVERLAY + 1)
        .setInteractive({ useHandCursor: true });

      this.add.text(W/2, H/2 + 86, 'JOGAR NOVAMENTE', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px', color: '#ffffff',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(DEPTH.OVERLAY + 2);

      btn.on('pointerover', () => btn.setFillStyle(0xcc2200));
      btn.on('pointerout',  () => btn.setFillStyle(COLOR.WALL));
      btn.on('pointerdown', () => this.scene.restart());
    });
  }
}
