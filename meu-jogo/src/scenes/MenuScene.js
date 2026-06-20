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
    this._mkButton(W/2, 244, 300, 50, 'JOGAR', COLOR.WALL, COLOR.WALL_GLOW, 0xbb1800,
      FONT.VALUE, () => this._startGame());

    this._mkButton(W/2, 300, 220, 36, 'FASES', 0x12001a, COLOR.GOLD, 0x22002e,
      FONT.BODY, () => this.scene.start('LevelSelectScene'));

    const hint = this.add.text(W/2, 332, 'ou pressione ESPACO', txt(FONT.BODY, '#ffffff33'))
      .setOrigin(0.5).setDepth(3);
    this.tweens.add({
      targets: hint, alpha: 0.06, duration: 750, yoyo: true, repeat: -1,
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
    return btn;
  }

  // ── CONTROLES ─────────────────────────────────────────────
  _buildControls() {
    const by    = H - 36;
    const items = [
      ['WASD',  'mover'],
      ['MOUSE', 'atirar'],
      ['R',     'recarregar'],
      ['ESC',   'pausar'],
    ];
    const totalW = 480, itemW = totalW / items.length;

    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(0x000000, 0.45);
    bg.fillRoundedRect(W/2 - totalW/2, by - 22, totalW, 44, 4);
    bg.lineStyle(1, 0x330000, 0.7);
    bg.strokeRoundedRect(W/2 - totalW/2, by - 22, totalW, 44, 4);

    items.forEach(([key, action], i) => {
      const ix = W/2 - totalW/2 + itemW * i + itemW/2;
      this.add.text(ix, by - 8, key,    txt(FONT.BODY, '#ffd740')).setOrigin(0.5).setDepth(4);
      this.add.text(ix, by + 8, action, txt(FONT.BODY, '#aaaaaa')).setOrigin(0.5).setDepth(4);
    });
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

  // ── TRANSIÇÃO ─────────────────────────────────────────────
  _startGame() {
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t >= 1) this.scene.start('GameScene', { startLevel: 1 });
    });
  }

  // ── UPDATE ────────────────────────────────────────────────
  update(_, delta) {
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
