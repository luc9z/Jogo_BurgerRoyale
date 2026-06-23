import Phaser from 'phaser';
import {
  GAME, ARENA, COLOR, DEPTH, EVT, WEAPONS, PLAYER, MAX_LEVELS,
} from '../constants.js';
import Player       from '../entities/Player.js';
import EnemyManager from '../systems/EnemyManager.js';
import HUD          from '../ui/HUD.js';
import { txt, FONT } from '../ui/text.js';
import {
  getUnlocked, unlockLevel, saveSnapshot, loadSnapshot,
  markCompleted, saveBest,
} from '../systems/progress.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // scene.start('GameScene', { startLevel }) — fase escolhida no menu
  init(data) {
    this._startLevel = Math.max(1, Math.min(MAX_LEVELS, data?.startLevel ?? 1));
  }

  // ── PRELOAD ──────────────────────────────────────────────
  preload() {
    // Na segunda execução (restart), assets já estão em cache — pula o preload
    if (this.textures.exists('king-frame-idle')) return;

    const { WIDTH: W, HEIGHT: H } = GAME;
    this.add.rectangle(W/2, H/2, W, H, 0x08000d);
    this.add.text(W/2, H/2 - 36, 'BURGER ROYALE', txt(FONT.TITLE, '#ffd740')).setOrigin(0.5);
    this.add.text(W/2, H/2 - 4, 'CLOWN APOCALYPSE', txt(FONT.BODY, '#cc3300')).setOrigin(0.5);

    this.add.rectangle(W/2, H/2 + 28, 304, 16, 0x1a0008).setStrokeStyle(2, 0x8b1a00);
    const bar = this.add.rectangle(W/2 - 150, H/2 + 28, 0, 12, 0xd4a000).setOrigin(0, 0.5);
    const pct = this.add.text(W/2, H/2 + 50, '0%', txt(FONT.BODY, '#ff8800')).setOrigin(0.5);

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
    this.load.audio('bgm',              'assets/audio/background-music.mp3');
    this.load.audio('victory-music',    'assets/audio/victory-music.mp3');
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
    this._gpStartPrev     = false;

    this._makeBulletTexture();
    this._smoothTextures();
    this._createAnims();
    this._buildMap();

    this.hud     = new HUD(this);
    this.player  = new Player(this);
    this.enemies = new EnemyManager(this);

    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Handlers nomeados — removidos no shutdown para NÃO acumularem a cada
    // scene.restart() (this.events persiste entre restarts → listeners duplicados,
    // causando pontos em dobro / drops duplicados ao "jogar novamente").
    const onResume = () => {
      this._paused = false;
      if (this._pendingNextRound) {
        this._pendingNextRound = false;
        this._roundEnding      = false;
        this.enemies.startRound();
      }
    };
    const onKilled = pts => {
      this.score += pts;
      this.events.emit('score-changed', this.score);
    };
    const onDead = () => this._gameOver();
    // Salva progresso quando uma fase começa: desbloqueia + snapshot do
    // estado de ENTRADA (permite começar direto por essa fase no menu).
    const onRoundStart = r => this._saveProgress(r);

    this.events.on('resume', onResume);
    this.events.on(EVT.ENEMY_KILLED, onKilled);
    this.events.on(EVT.PLAYER_DEAD, onDead);
    this.events.on('round-changed', onRoundStart);

    this._setupPickups();

    this.events.once('shutdown', () => {
      this.events.off('resume', onResume);
      this.events.off(EVT.ENEMY_KILLED, onKilled);
      this.events.off(EVT.PLAYER_DEAD, onDead);
      this.events.off('round-changed', onRoundStart);
      this.events.off('drop-heal', this._onDropHeal);
      this.events.off('show-boss-warning', this._onBossWarning);
      if (this._bgm) { this._bgm.stop(); this._bgm.destroy(); this._bgm = null; }
    });

    // Começar numa fase liberada → restaura o estado salvo daquela fase
    if (this._startLevel > 1) {
      const snap = loadSnapshot(this._startLevel);
      if (snap) {
        this.player.applyState(snap);
        this.score = snap.score ?? 0;
        this.events.emit('score-changed', this.score);
      }
      this.enemies.round = this._startLevel - 1; // startRound() faz ++ → fase certa
    }

    this.enemies.startRound();

    this.sound.stopByKey('bgm');
    this._bgm = this.sound.add('bgm', { loop: true, volume: 0.35 });
    this._bgm.play();
  }

  // ── UPDATE ───────────────────────────────────────────────
  update(_t, delta) {
    if (this.isGameOver) { this._updateGoGamepad(); return; }

    const _pad       = this.input.gamepad?.getPad(0);
    const _gpStart   = !!(_pad?.buttons[9]?.pressed);
    const _gpPause   = _gpStart && !this._gpStartPrev;
    this._gpStartPrev = _gpStart;

    if ((Phaser.Input.Keyboard.JustDown(this._escKey) || _gpPause) && !this._paused) {
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
      this._roundEnding = true;
      this.enemies.endRound();
      this.player.reloadFull();

      const cleared = this.enemies.round;
      // Limpou a última fase → vitória (sem mais rounds)
      if (cleared >= MAX_LEVELS) { this._victory(); return; }

      this._pendingNextRound = true;
      this.hud.showRoundClear(cleared);

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

  // Desbloqueia a fase + grava snapshot do estado de entrada nela
  _saveProgress(level) {
    if (!this.player) return;
    unlockLevel(level);
    saveSnapshot(level, { ...this.player.serialize(), score: this.score });
  }

  // ── PICKUPS DE CURA ──────────────────────────────────────
  _setupPickups() {
    this._onDropHeal = (x, y) => {
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
    };

    this._onBossWarning = () => {
      const { WIDTH: W, HEIGHT: H } = GAME;
      const lbl = this.add.text(W/2, H/2 - 72, '⚠  CHEFE CHEGANDO!  ⚠', txt(FONT.TITLE, '#ff0000'))
        .setOrigin(0.5).setDepth(DEPTH.BANNER + 1).setAlpha(0);
      this.tweens.add({
        targets: lbl, alpha: 1, duration: 220, yoyo: true, repeat: 5,
        onComplete: () => lbl.destroy(),
      });
    };

    this.events.on('drop-heal', this._onDropHeal);
    this.events.on('show-boss-warning', this._onBossWarning);
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

  // Filtro LINEAR nas texturas de arte (sprites/fundo) para escalarem suaves.
  // Texto continua NEAREST (pixelArt global) = fontes nítidas.
  _smoothTextures() {
    const keys = [
      'king-frame-idle', 'king-frame-walk-a', 'king-frame-walk-b',
      'king-frame-attack', 'king-frame-hurt', 'king-frame-dead',
      'clown-frame-idle', 'clown-frame-walk-a', 'clown-frame-walk-b',
      'clown-frame-attack', 'clown-frame-hurt', 'clown-frame-dead',
      'background',
    ];
    for (const k of keys) {
      if (this.textures.exists(k)) {
        this.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
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
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.25).setDepth(DEPTH.BG+1);

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
    if (this._bgm) this._bgm.stop();

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
      const ps = txt;

      this.add.text(W/2, H/2-110, 'GAME OVER',               ps(FONT.HERO,'#ff2200')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-64,  'Os palhaços venceram...', ps(FONT.BODY,'#ffaa00')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-36,  `Pontuação: ${this.score.toLocaleString('pt-BR')}`, ps(FONT.VALUE,'#ffd740')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-8,   `Rounds: ${this.enemies.round}`, ps(FONT.BODY,'#ff8800')).setOrigin(0.5).setDepth(D+1);
      if (isNew) {
        this.add.text(W/2, H/2+18, '✦ NOVO RECORDE! ✦', ps(FONT.BODY,'#ffd740')).setOrigin(0.5).setDepth(D+1);
      }

      const mkBtn = (y, label, col, onClick) => {
        const btn = this.add.rectangle(W/2, y, 280, 40, 0x0c000f)
          .setStrokeStyle(2, col).setDepth(D+1)
          .setInteractive({ useHandCursor: true });
        const label2 = this.add.text(W/2, y, label, ps(FONT.BODY, '#ffffff')).setOrigin(0.5).setDepth(D+2);
        btn.on('pointerover', () => { btn.setFillStyle(0x1a001a); this.tweens.add({ targets:[btn,label2], scaleX:1.05, scaleY:1.05, duration:60 }); });
        btn.on('pointerout',  () => { btn.setFillStyle(0x0c000f); this.tweens.add({ targets:[btn,label2], scaleX:1,    scaleY:1,    duration:60 }); });
        btn.on('pointerdown', onClick);
      };

      const _goRestart = () => {
        if (this.scene.isActive('UpgradeScene')) this.scene.stop('UpgradeScene');
        if (this.scene.isActive('PauseScene')) this.scene.stop('PauseScene');
        this.scene.start('GameScene');
      };
      const _goMenu = () => {
        this.scene.stop('UpgradeScene');
        this.scene.stop('PauseScene');
        this.scene.start('MenuScene');
      };

      mkBtn(H/2 + 86,  'JOGAR NOVAMENTE', COLOR.WALL_GLOW, _goRestart);
      mkBtn(H/2 + 140, 'MENU PRINCIPAL',  0x555555,        _goMenu);

      // Gamepad navigation
      this._goGpIdx     = 0;
      this._goGpActions = [_goRestart, _goMenu];
      this._goBtnYs     = [H/2 + 86, H/2 + 140];
      this._goBtnCols   = [COLOR.WALL_GLOW, 0x555555];
      this._goGpPrevs   = { up: false, down: false, a: false };
      this._goGpEnabled = false;
      this._goSelector  = this.add.graphics().setDepth(D + 3);
      this.time.delayedCall(300, () => { this._goGpEnabled = true; });
      this._drawGoSelector();
    });
  }

  // Fanfarra de vitória sintetizada (WebAudio) — sem arquivo externo.
  _playVictoryFanfare() {
    const ctx = this.sound?.context;
    if (!ctx || ctx.state === 'closed' || this.sound.mute) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now    = ctx.currentTime + 0.05;
    const master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);

    const note = (freq, start, dur, type = 'triangle', vol = 0.22) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.linearRampToValueAtTime(vol, now + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g); g.connect(master);
      o.start(now + start);
      o.stop(now + start + dur + 0.05);
    };

    // Arpejo de Dó maior subindo + acorde final triunfante
    const C = 523.25, E = 659.25, G = 783.99, C2 = 1046.5, Glow = 196.0;
    note(Glow,  0.00, 0.25, 'sawtooth', 0.10);   // baixo
    note(C / 2, 0.22, 0.70, 'sawtooth', 0.10);
    note(C,  0.00, 0.16);
    note(E,  0.16, 0.16);
    note(G,  0.32, 0.16);
    note(C2, 0.48, 0.55);
    // acorde final
    note(C,  1.00, 0.95, 'triangle', 0.16);
    note(E,  1.00, 0.95, 'triangle', 0.14);
    note(G,  1.00, 0.95, 'triangle', 0.14);
    note(C2, 1.00, 0.95, 'triangle', 0.12);
  }

  // ── VITÓRIA (limpou a fase 5) ────────────────────────────
  _victory() {
    if (this._goShown) return;
    this._goShown   = true;
    this.isGameOver = true;
    this.physics.pause();
    if (this._bgm) this._bgm.stop();
    this.input.setDefaultCursor('default');

    markCompleted();
    unlockLevel(MAX_LEVELS);
    const isNew = saveBest(this.score);

    // Música de vitória (arquivo). Fallback para a fanfarra sintetizada.
    if (this.cache.audio.exists('victory-music')) {
      this._victoryMusic = this.sound.add('victory-music', { volume: 0.55 });
      this._victoryMusic.play();
    } else {
      this._playVictoryFanfare();
    }

    const { WIDTH: W, HEIGHT: H } = GAME;
    const D = DEPTH.OVERLAY;
    const ps = txt;

    const ov = this.add.rectangle(W/2, H/2, W, H, 0x0a0500, 0).setDepth(D);
    this.tweens.add({ targets: ov, fillAlpha: 0.9, duration: 700 });

    // Confete dourado caindo
    for (let i = 0; i < 40; i++) {
      const cols = [0xffd740, 0xff8800, 0x44ff88, 0x00aaff, 0xff2244];
      const c = this.add.rectangle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(-H, 0),
        Phaser.Math.Between(4, 8), Phaser.Math.Between(4, 8),
        cols[i % cols.length], 1,
      ).setDepth(D).setAngle(Phaser.Math.Between(0, 360));
      this.tweens.add({
        targets: c, y: H + 20, angle: c.angle + 360,
        duration: Phaser.Math.Between(2200, 4200), delay: Phaser.Math.Between(0, 1500),
        repeat: -1, ease: 'Linear',
        onRepeat: () => { c.y = -20; c.x = Phaser.Math.Between(0, W); },
      });
    }

    this.time.delayedCall(450, () => {
      const title = this.add.text(W/2, H/2-104, 'VITÓRIA!', ps(FONT.HERO, '#ffd740'))
        .setOrigin(0.5).setDepth(D+1);
      this.tweens.add({ targets: title, scaleX: 1.06, scaleY: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      this.add.text(W/2, H/2-58, 'Você sobreviveu ao apocalipse dos palhaços!', ps(FONT.BODY, '#ffaa00')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-30, `Pontuação final: ${this.score.toLocaleString('pt-BR')}`, ps(FONT.VALUE, '#ffd740')).setOrigin(0.5).setDepth(D+1);
      this.add.text(W/2, H/2-2,  `${MAX_LEVELS} fases concluídas`, ps(FONT.BODY, '#44ff88')).setOrigin(0.5).setDepth(D+1);
      if (isNew) {
        this.add.text(W/2, H/2+22, '✦ NOVO RECORDE! ✦', ps(FONT.BODY, '#ffd740')).setOrigin(0.5).setDepth(D+1);
      }

      const mkBtn = (y, label, col, onClick) => {
        const btn = this.add.rectangle(W/2, y, 280, 40, 0x0c000f)
          .setStrokeStyle(2, col).setDepth(D+1)
          .setInteractive({ useHandCursor: true });
        const lbl = this.add.text(W/2, y, label, ps(FONT.BODY, '#ffffff')).setOrigin(0.5).setDepth(D+2);
        btn.on('pointerover', () => { btn.setFillStyle(0x1a1400); this.tweens.add({ targets:[btn,lbl], scaleX:1.05, scaleY:1.05, duration:60 }); });
        btn.on('pointerout',  () => { btn.setFillStyle(0x0c000f); this.tweens.add({ targets:[btn,lbl], scaleX:1,    scaleY:1,    duration:60 }); });
        btn.on('pointerdown', onClick);
      };

      const _vRestart = () => {
        if (this._victoryMusic) this._victoryMusic.stop();
        if (this.scene.isActive('UpgradeScene')) this.scene.stop('UpgradeScene');
        if (this.scene.isActive('PauseScene')) this.scene.stop('PauseScene');
        this.scene.start('GameScene', { startLevel: 1 });
      };
      const _vMenu = () => {
        if (this._victoryMusic) this._victoryMusic.stop();
        this.scene.stop('UpgradeScene');
        this.scene.stop('PauseScene');
        this.scene.start('MenuScene');
      };

      mkBtn(H/2 + 90,  'JOGAR DE NOVO',  COLOR.GOLD_LIGHT, _vRestart);
      mkBtn(H/2 + 144, 'MENU PRINCIPAL', 0x555555,          _vMenu);

      // Gamepad navigation
      this._goGpIdx     = 0;
      this._goGpActions = [_vRestart, _vMenu];
      this._goBtnYs     = [H/2 + 90, H/2 + 144];
      this._goBtnCols   = [COLOR.GOLD_LIGHT, 0x555555];
      this._goGpPrevs   = { up: false, down: false, a: false };
      this._goGpEnabled = false;
      this._goSelector  = this.add.graphics().setDepth(D + 3);
      this.time.delayedCall(300, () => { this._goGpEnabled = true; });
      this._drawGoSelector();
    });
  }

  // ── GAMEPAD NAV: telas de game over / vitória ────────────
  _drawGoSelector() {
    if (!this._goSelector || !this._goBtnYs) return;
    const { WIDTH: W } = GAME;
    const y   = this._goBtnYs[this._goGpIdx];
    const col = this._goBtnCols[this._goGpIdx];
    const bw = 280, bh = 40, pad = 6;
    this._goSelector.clear();
    this._goSelector.lineStyle(3, col, 1);
    this._goSelector.strokeRect(W/2 - bw/2 - pad, y - bh/2 - pad, bw + pad*2, bh + pad*2);
    const lx = W/2 - bw/2 - pad, ty = y - bh/2 - pad;
    const rx = lx + bw + pad*2,  by = ty + bh + pad*2, cs = 10;
    this._goSelector.lineStyle(2, 0xffffff, 0.75);
    [[lx,ty,1,1],[rx,ty,-1,1],[lx,by,1,-1],[rx,by,-1,-1]].forEach(([ox,oy,sx,sy]) => {
      this._goSelector.lineBetween(ox, oy, ox + sx*cs, oy);
      this._goSelector.lineBetween(ox, oy, ox, oy + sy*cs);
    });
  }

  _updateGoGamepad() {
    if (!this._goGpEnabled || !this._goGpActions) return;
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) return;
    const ly  = pad.leftStick?.y ?? 0;
    const now = {
      up:   !!(pad.buttons[12]?.pressed) || ly < -0.5,
      down: !!(pad.buttons[13]?.pressed) || ly >  0.5,
      a:    !!(pad.buttons[0]?.pressed),
    };
    const prev = this._goGpPrevs;
    const n    = this._goGpActions.length;
    if (now.up   && !prev.up)   { this._goGpIdx = (this._goGpIdx - 1 + n) % n; this._drawGoSelector(); }
    if (now.down && !prev.down) { this._goGpIdx = (this._goGpIdx + 1) % n;     this._drawGoSelector(); }
    if (now.a    && !prev.a)    { this._goGpActions[this._goGpIdx](); }
    this._goGpPrevs = now;
  }
}
