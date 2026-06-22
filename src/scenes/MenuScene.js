import Phaser from 'phaser';
import { GAME, COLOR } from '../constants.js';
import { txt, FONT } from '../ui/text.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  preload() {
    if (!this.textures.exists('menu-king'))
      this.load.svg('menu-king',  'assets/sprites/king-idle.svg',  { width: 120, height: 180 });
    if (!this.textures.exists('menu-clown'))
      this.load.svg('menu-clown', 'assets/sprites/clown-idle.svg', { width: 120, height: 180 });
  }

  create() {
    this._buildBackground();
    this._buildCharacters();
    this._buildTitle();
    this._buildBestScore();
    this._gpIdx      = 0;   // 0 = JOGAR, 1 = FASES
    this._gpPrevs    = { up: false, down: false, a: false, start: false };
    this._menuBtns   = [];  // preenchido por _buildPlayButton
    this._buildPlayButton();
    this._buildControls();
    this._buildBloodDrips();

    this.input.keyboard.once('keydown-SPACE', () => this._startGame());
  }

  // ── FUNDO ─────────────────────────────────────────────────
  _buildBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x150003, 0x150003, 0x010008, 0x010008, 1);
    bg.fillRect(0, 0, W, H);

    // Manchas de sangue escuras nos cantos
    const splat = this.add.graphics().setAlpha(0.18);
    splat.fillStyle(0x5a0000, 1);
    splat.fillCircle(60,   60,   110);
    splat.fillCircle(W-60, 60,   95);
    splat.fillCircle(80,   H-50, 85);
    splat.fillCircle(W-80, H-50, 100);

    // Brilho central quente (halo do título)
    const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0.4);
    glow.fillStyle(0x6a0010, 1);
    glow.fillCircle(W/2, H/2 - 50, 260);

  }

  // ── PERSONAGENS ───────────────────────────────────────────
  _buildCharacters() {
    const charY = 480;

    // --- Rei (esquerda) ---
    const kingGlow = this.add.graphics()
      .setDepth(1).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0.3);
    kingGlow.fillStyle(0xd4a000, 1);
    kingGlow.fillCircle(155, charY - 90, 75);

    if (this.textures.exists('menu-king')) {
      this._kingSprite = this.add.image(155, charY, 'menu-king')
        .setOrigin(0.5, 1).setScale(1.35).setDepth(2);

      this.tweens.add({
        targets: this._kingSprite, y: charY - 10,
        duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    this.add.ellipse(155, charY + 2, 130, 18, 0x000000, 0.5).setDepth(1);

    // --- Palhaço boss (direita, maior e sinistro) ---
    const clownGlow = this.add.graphics()
      .setDepth(1).setBlendMode(Phaser.BlendModes.SCREEN).setAlpha(0.25);
    clownGlow.fillStyle(0x00aa00, 1);
    clownGlow.fillCircle(W-155, charY - 100, 90);

    if (this.textures.exists('menu-clown')) {
      this._clownSprite = this.add.image(W-155, charY, 'menu-clown')
        .setOrigin(0.5, 1).setScale(1.65).setFlipX(true).setDepth(2);

      this.tweens.add({
        targets: this._clownSprite, angle: 5,
        duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    this.add.ellipse(W-155, charY + 2, 150, 20, 0x000000, 0.5).setDepth(1);

    // "VS" entre os dois
    const vs = this.add.text(W/2, charY - 90, 'VS', txt(FONT.HERO, '#cc1100'))
      .setOrigin(0.5).setDepth(3).setAlpha(0.85);
    this.tweens.add({
      targets: vs, scaleX: 0.88, scaleY: 0.88, alpha: 0.45,
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ── TÍTULO ────────────────────────────────────────────────
  _buildTitle() {
    this._drawCrown(W/2, 68, 36, 0xffd740, 0.85);

    const title = this.add.text(W/2, 118, 'BURGER ROYALE', txt(FONT.HERO, '#ffd740'))
      .setOrigin(0.5).setDepth(3);
    this.tweens.add({
      targets: title, scaleX: 1.025, scaleY: 1.025,
      duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const sep = this.add.graphics().setDepth(3);
    sep.lineStyle(2, 0x8b0000, 0.9);
    sep.lineBetween(W/2 - 210, 152, W/2 + 210, 152);
    sep.fillStyle(0xff2200, 1);
    sep.fillCircle(W/2 - 210, 152, 3.5);
    sep.fillCircle(W/2,       152, 2.5);
    sep.fillCircle(W/2 + 210, 152, 3.5);

    const sub = this.add.text(W/2, 168, 'CLOWN APOCALYPSE', txt(FONT.BODY, '#cc2200'))
      .setOrigin(0.5).setDepth(3);
    this.tweens.add({
      targets: sub, alpha: 0.6,
      duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _drawCrown(cx, cy, size, color, alpha) {
    const g = this.add.graphics().setAlpha(alpha).setDepth(3);
    g.fillStyle(color, 1);
    g.fillRect(cx - size, cy + size * 0.15, size * 2, size * 0.55);
    g.fillTriangle(
      cx - size, cy + size * 0.15, cx - size + size * 0.35, cy + size * 0.15,
      cx - size + size * 0.17, cy - size * 0.80,
    );
    g.fillTriangle(
      cx - size * 0.22, cy + size * 0.15, cx + size * 0.22, cy + size * 0.15,
      cx, cy - size * 1.05,
    );
    g.fillTriangle(
      cx + size - size * 0.35, cy + size * 0.15, cx + size, cy + size * 0.15,
      cx + size - size * 0.17, cy - size * 0.80,
    );
    g.fillStyle(0xff4444, 1);
    g.fillCircle(cx - size * 0.62, cy + size * 0.38, size * 0.13);
    g.fillCircle(cx,                cy + size * 0.38, size * 0.15);
    g.fillCircle(cx + size * 0.62,  cy + size * 0.38, size * 0.13);
  }

  // ── RECORDE ───────────────────────────────────────────────
  _buildBestScore() {
    const best = parseInt(localStorage.getItem('burgerRoyale_best') || '0');
    const label = best > 0
      ? `RECORDE: ${best.toLocaleString('pt-BR')} pts`
      : 'Sem recorde ainda!';
    this.add.text(W/2, 196, label, txt(FONT.BODY, best > 0 ? '#ff8800' : '#444444'))
      .setOrigin(0.5).setDepth(3);
  }

  // ── BOTÕES ────────────────────────────────────────────────
  _buildPlayButton() {
    const b0 = this._mkButton(W/2, 244, 300, 50, 'JOGAR', COLOR.WALL, COLOR.WALL_GLOW, 0xbb1800,
      FONT.VALUE, () => this._startGame());
    const b1 = this._mkButton(W/2, 300, 220, 36, 'FASES', 0x12001a, COLOR.GOLD, 0x22002e,
      FONT.BODY, () => this.scene.start('LevelSelectScene'));

    this._menuBtns = [
      { btn: b0.btn, lbl: b0.lbl, fill: COLOR.WALL,  hover: 0xbb1800, stroke: COLOR.WALL_GLOW, action: () => this._startGame() },
      { btn: b1.btn, lbl: b1.lbl, fill: 0x12001a,    hover: 0x22002e, stroke: COLOR.GOLD,      action: () => this.scene.start('LevelSelectScene') },
    ];

    // Cursor de seleção (gamepad)
    this._gpCursor = this.add.graphics().setDepth(5);
    this._drawGpCursor();

    const hint = this.add.text(W/2, 332, 'ou pressione ESPACO / A', txt(FONT.BODY, '#ffffff33'))
      .setOrigin(0.5).setDepth(3);
    this.tweens.add({ targets: hint, alpha: 0.06, duration: 750, yoyo: true, repeat: -1 });
  }

  _drawGpCursor() {
    if (!this._gpCursor || this._menuBtns.length === 0) return;
    const b   = this._menuBtns[this._gpIdx].btn;
    const x   = b.x, y = b.y, hw = b.width / 2 + 6, hh = b.height / 2 + 6;
    this._gpCursor.clear();
    this._gpCursor.lineStyle(2, 0xffffff, 0.9);
    [[x-hw,y-hh,1,0],[x+hw,y-hh,-1,0],[x-hw,y+hh,1,0],[x+hw,y+hh,-1,0]].forEach(([ox,oy,sx]) => {
      this._gpCursor.lineBetween(ox, oy, ox + sx*10, oy);
    });
    [[x-hw,y-hh,0,1],[x+hw,y-hh,0,1],[x-hw,y+hh,0,-1],[x+hw,y+hh,0,-1]].forEach(([ox,oy,_,sy]) => {
      this._gpCursor.lineBetween(ox, oy, ox, oy + sy*10);
    });
  }

  _mkButton(x, y, w, h, label, fill, stroke, hover, fontSize, onClick) {
    const btn = this.add.rectangle(x, y, w, h, fill)
      .setStrokeStyle(3, stroke).setDepth(3)
      .setInteractive({ useHandCursor: true });
    const lbl = this.add.text(x, y, label, txt(fontSize, '#ffffff')).setOrigin(0.5).setDepth(4);
    btn.on('pointerover', () => { btn.setFillStyle(hover);
      this.tweens.add({ targets: [btn, lbl], scaleX: 1.06, scaleY: 1.06, duration: 70 }); });
    btn.on('pointerout',  () => { btn.setFillStyle(fill);
      this.tweens.add({ targets: [btn, lbl], scaleX: 1, scaleY: 1, duration: 70 }); });
    btn.on('pointerdown', onClick);
    return { btn, lbl };
  }

  // ── CONTROLES ─────────────────────────────────────────────
  _buildControls() {
    const totalW = 680;
    const rowH   = 36;
    const barH   = rowH * 2 + 16;
    const barY   = H - barH / 2 - 8;

    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(0x000000, 0.5);
    bg.fillRoundedRect(W/2 - totalW/2, barY - barH/2, totalW, barH, 5);
    bg.lineStyle(1, 0x330000, 0.6);
    bg.strokeRoundedRect(W/2 - totalW/2, barY - barH/2, totalW, barH, 5);

    const midY = barY;
    bg.lineStyle(1, 0x330000, 0.4);
    bg.lineBetween(W/2 - totalW/2 + 12, midY, W/2 + totalW/2 - 12, midY);

    // 5 colunas — teclado e controle alinhados pela ação
    const kbItems = [
      ['WASD',  'mover'],
      ['MOUSE', 'mirar'],
      ['CLICK', 'atirar'],
      ['R',     'recarregar'],
      ['ESC',   'pausar'],
    ];
    // A (Xbox) = X/Cruz no PS5  |  X (Xbox) = Quadrado no PS5
    const gpItems = [
      ['L.STICK', 'mover'],
      ['R.STICK', 'mirar'],
      ['RT / A',  'atirar'],     // A = Cruz (PS5)
      ['X / LB',  'recarreg.'], // X = Quad (PS5)
      ['START',   'pausar'],
    ];

    const itemW = totalW / kbItems.length;
    const ky = barY - rowH/2 + 6;
    const gy = barY + rowH/2 - 6;

    kbItems.forEach(([key, action], i) => {
      const ix = W/2 - totalW/2 + itemW * i + itemW/2;
      this.add.text(ix, ky - 8, key,    txt(FONT.BODY, '#ffd740')).setOrigin(0.5).setDepth(4);
      this.add.text(ix, ky + 8, action, txt(FONT.BODY, '#888888')).setOrigin(0.5).setDepth(4);
    });

    gpItems.forEach(([key, action], i) => {
      const ix = W/2 - totalW/2 + itemW * i + itemW/2;
      this.add.text(ix, gy - 8, key,    txt(FONT.BODY, '#88ffcc')).setOrigin(0.5).setDepth(4);
      this.add.text(ix, gy + 8, action, txt(FONT.BODY, '#555555')).setOrigin(0.5).setDepth(4);
    });

    // Ícone de gamepad à esquerda
    const gi = this.add.graphics().setDepth(4).setAlpha(0.5);
    gi.fillStyle(0x88ffcc, 1);
    gi.fillRoundedRect(W/2 - totalW/2 - 22, gy - 6, 14, 12, 3);
    gi.fillCircle(W/2 - totalW/2 - 18, gy + 2, 2);
    gi.fillCircle(W/2 - totalW/2 - 11, gy - 1, 2);
  }

  // ── PINGOS DE SANGUE ──────────────────────────────────────
  _buildBloodDrips() {
    this._drips = [];
    const xs = [30, 115, 230, 390, 530, 670, 790, 900];
    for (const x of xs) {
      const g = this.add.graphics().setDepth(1);
      this._drips.push({
        g, x,
        y:     Phaser.Math.Between(-60, -5),
        speed: Phaser.Math.Between(20, 50),
        len:   Phaser.Math.Between(10, 28),
      });
    }
  }

  _drawDrip(d) {
    d.g.clear();
    d.g.fillStyle(0x6a0000, 0.8);
    d.g.fillRect(d.x - 2, d.y, 4, d.len);
    d.g.fillCircle(d.x, d.y + d.len, 4.5);
  }

  // ── NAVEGAÇÃO CONTROLE ────────────────────────────────────
  _updateGamepad() {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) { this._gpCursor?.setVisible(false); return; }
    this._gpCursor?.setVisible(true);

    const ly = pad.leftStick?.y ?? 0;
    const now = {
      up:    !!(pad.buttons[12]?.pressed) || ly < -0.5,
      down:  !!(pad.buttons[13]?.pressed) || ly >  0.5,
      a:     !!(pad.buttons[0]?.pressed),
      start: !!(pad.buttons[9]?.pressed),
    };
    const prev = this._gpPrevs;

    if ((now.up || now.down) && !(prev.up || prev.down)) {
      this._gpIdx = 1 - this._gpIdx;
      this._drawGpCursor();
    }
    if ((now.a || now.start) && !(prev.a || prev.start)) {
      this._menuBtns[this._gpIdx].action();
    }

    this._gpPrevs = now;
  }

  // ── TRANSIÇÃO ─────────────────────────────────────────────
  _startGame() {
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t >= 1) this.scene.start('GameScene', { startLevel: 1 });
    });
  }

  // ── UPDATE ────────────────────────────────────────────────
  update(_, delta) {
    this._updateGamepad();
    const dt = delta / 1000;
    for (const d of this._drips) {
      d.y += d.speed * dt;
      if (d.y > H + 40) {
        d.y = Phaser.Math.Between(-80, -10);
        d.x = Phaser.Math.Between(0, W);
        d.len = Phaser.Math.Between(10, 28);
      }
      this._drawDrip(d);
    }
  }
}
