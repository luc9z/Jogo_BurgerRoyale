import Phaser from 'phaser';
import { GAME, COLOR } from '../constants.js';
import { txt, FONT } from '../ui/text.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this._buildBackground();
    this._buildGameArt();
    this._buildTitle();
    this._buildBestScore();
    this._buildPlayButton();
    this._buildControls();
    this._buildFooter();

    // ESPAÇO também inicia o jogo
    this.input.keyboard.once('keydown-SPACE', () => this._startGame());
  }

  _buildBackground() {
    // Fundo com gradiente vertical (vinho escuro → preto)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0410, 0x1a0410, 0x05000a, 0x05000a, 1);
    bg.fillRect(0, 0, W, H);

    // Brilho radial central quente
    const glow = this.add.graphics().setAlpha(0.5);
    glow.fillStyle(0x4a0a1a, 1);
    glow.fillCircle(W / 2, H / 2 - 60, 320);
    glow.setBlendMode(Phaser.BlendModes.SCREEN);

    // Grade em perspectiva no "chão"
    const g = this.add.graphics().setAlpha(0.10);
    g.lineStyle(1, 0xffd740);
    for (let x = 0; x < W; x += 48) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 48) g.lineBetween(0, y, W, y);
  }

  // Arte temática: hambúrguer gigante + palhaços assassinos espreitando
  _buildGameArt() {
    const art = this.add.graphics().setDepth(1);

    // Hambúrguer emblema gigante atrás do título (bem suave)
    this._drawBurger(art, W / 2, H / 2 - 96, 2.6, 0.10);

    // Palhaços espreitando nos cantos inferiores
    this._drawClown(art, 86,      H - 70, 1.5, 0.16, false);
    this._drawClown(art, W - 86,  H - 70, 1.5, 0.16, true);
    this._drawClown(art, 200,     H - 30, 1.0, 0.10, true);
    this._drawClown(art, W - 200, H - 30, 1.0, 0.10, false);

    // Respingos/balas flutuando (representam o caos do jogo)
    this._particles = [];
    const cols = [0xff2200, 0xffd740, 0xff8800, 0x22cc44, 0x00aaff, 0xcc00ff];
    for (let i = 0; i < 16; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const r = Phaser.Math.Between(3, 8);
      const c = cols[i % cols.length];
      const a = 0.06 + Math.random() * 0.12;
      const obj = this.add.circle(x, y, r, c, a).setDepth(1);
      this._particles.push({ obj, vx: (Math.random() - 0.5) * 28, vy: (Math.random() - 0.5) * 24 });
    }

    // Vinheta: bordas escurecidas (por cima da arte, deixa o centro limpo)
    const vig = this.add.graphics().setDepth(2);
    vig.fillStyle(0x000000, 0.55);
    vig.fillRect(0, 0, W, 56);
    vig.fillRect(0, H - 70, W, 70);
    vig.fillRect(0, 0, 56, H);
    vig.fillRect(W - 56, 0, 56, H);
  }

  // Hambúrguer estilizado (pão, gergelim, carne, queijo, alface)
  _drawBurger(g, cx, cy, s, a) {
    const w = 90 * s;
    // Pão de cima
    g.fillStyle(0xc97b29, a);
    g.fillEllipse(cx, cy - 26 * s, w, 44 * s);
    g.fillStyle(0xe0903a, a);
    g.fillRect(cx - w / 2, cy - 22 * s, w, 22 * s);
    // Gergelim
    g.fillStyle(0xfff0c0, a * 1.2);
    for (let i = -2; i <= 2; i++) g.fillEllipse(cx + i * 16 * s, cy - 32 * s, 5 * s, 3 * s);
    // Alface
    g.fillStyle(0x3fae3f, a);
    for (let i = -3; i <= 3; i++) g.fillTriangle(
      cx + i * 14 * s, cy - 4 * s,
      cx + i * 14 * s - 9 * s, cy + 6 * s,
      cx + i * 14 * s + 9 * s, cy + 6 * s,
    );
    // Queijo
    g.fillStyle(0xffc02e, a);
    g.fillRect(cx - w / 2, cy + 2 * s, w, 8 * s);
    for (let i = -2; i <= 2; i++) g.fillTriangle(
      cx + i * 18 * s - 7 * s, cy + 10 * s,
      cx + i * 18 * s + 7 * s, cy + 10 * s,
      cx + i * 18 * s, cy + 16 * s,
    );
    // Carne
    g.fillStyle(0x5a2c12, a);
    g.fillRect(cx - w / 2, cy + 14 * s, w, 14 * s);
    // Pão de baixo
    g.fillStyle(0xc97b29, a);
    g.fillRect(cx - w / 2, cy + 28 * s, w, 12 * s);
    g.fillEllipse(cx, cy + 40 * s, w, 16 * s);
  }

  // Rosto de palhaço sinistro
  _drawClown(g, cx, cy, s, a, flip) {
    const f = flip ? -1 : 1;
    // Cabelo
    g.fillStyle(0xcc1100, a);
    g.fillCircle(cx - 22 * s, cy - 6 * s, 16 * s);
    g.fillCircle(cx + 22 * s, cy - 6 * s, 16 * s);
    g.fillCircle(cx, cy - 22 * s, 16 * s);
    // Rosto
    g.fillStyle(0xf4f4f4, a);
    g.fillCircle(cx, cy, 26 * s);
    // Olhos (X sinistros)
    g.lineStyle(3 * s, 0x111111, a * 1.4);
    g.lineBetween(cx - 16 * s, cy - 10 * s, cx - 6 * s, cy - 2 * s);
    g.lineBetween(cx - 16 * s, cy - 2 * s, cx - 6 * s, cy - 10 * s);
    g.lineBetween(cx + 6 * s, cy - 10 * s, cx + 16 * s, cy - 2 * s);
    g.lineBetween(cx + 6 * s, cy - 2 * s, cx + 16 * s, cy - 10 * s);
    // Nariz
    g.fillStyle(0xff1a1a, a * 1.5);
    g.fillCircle(cx, cy + 4 * s, 6 * s);
    // Sorriso maligno
    g.lineStyle(3 * s, 0xff1a1a, a * 1.4);
    g.beginPath();
    g.arc(cx, cy + 6 * s, 14 * s, 0.15 * Math.PI, 0.85 * Math.PI, false);
    g.strokePath();
    // Dente
    g.fillStyle(0xf4f4f4, a);
    g.fillRect(cx - 3 * f * s, cy + 14 * s, 6 * s, 5 * s);
  }

  _buildTitle() {
    const D = 3;
    // Brilho atrás do título
    const glow = this.add.rectangle(W / 2, H / 2 - 128, 600, 70, 0xd4a000, 0.06).setDepth(D);
    this.tweens.add({
      targets: glow, alpha: 0.14, duration: 1100,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const title = this.add.text(W / 2, H / 2 - 130, 'BURGER ROYALE', txt(FONT.HERO, '#ffd740'))
      .setOrigin(0.5).setDepth(D);

    this.tweens.add({
      targets: title, scaleX: 1.025, scaleY: 1.025,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, H / 2 - 92, 'CLOWN APOCALYPSE', txt(FONT.BODY, '#cc3300'))
      .setOrigin(0.5).setDepth(D);

    // Linha separadora decorativa
    const sep = this.add.graphics().setDepth(D);
    sep.lineStyle(1, 0xd4a000, 0.5);
    sep.lineBetween(W / 2 - 220, H / 2 - 70, W / 2 + 220, H / 2 - 70);
    sep.fillStyle(0xffd740, 0.8);
    sep.fillRect(W / 2 - 5, H / 2 - 73, 10, 6);
  }

  _buildBestScore() {
    const best = parseInt(localStorage.getItem('burgerRoyale_best') || '0');
    const t = best > 0
      ? this.add.text(W / 2, H / 2 - 50, `RECORDE: ${best.toLocaleString('pt-BR')} pts`, txt(FONT.BODY, '#ff8800'))
      : this.add.text(W / 2, H / 2 - 50, 'Sem recorde ainda — seja o primeiro!', txt(FONT.BODY, '#888888'));
    t.setOrigin(0.5).setDepth(3);
  }

  _buildPlayButton() {
    // JOGAR — sempre começa do zero na fase 1
    this._mkButton(W / 2, H / 2 + 8, 280, 48, 'JOGAR', COLOR.WALL, COLOR.WALL_GLOW, 0xbb1800,
      FONT.VALUE, () => this._startGame());

    // FASES — menu de seleção (continuar de fase liberada)
    this._mkButton(W / 2, H / 2 + 60, 220, 34, 'FASES', 0x12001a, COLOR.GOLD, 0x22002e,
      FONT.BODY, () => this.scene.start('LevelSelectScene'));

    const hint = this.add.text(W / 2, H / 2 + 90, 'ou pressione ESPAÇO', txt(FONT.BODY, '#ffffff55'))
      .setOrigin(0.5).setDepth(3);
    this.tweens.add({
      targets: hint, alpha: 0.1,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _mkButton(x, y, w, h, label, fill, stroke, hover, fontSize, onClick) {
    const btn = this.add.rectangle(x, y, w, h, fill)
      .setStrokeStyle(3, stroke).setDepth(3)
      .setInteractive({ useHandCursor: true });
    const lbl = this.add.text(x, y, label, txt(fontSize, '#ffffff')).setOrigin(0.5).setDepth(4);
    btn.on('pointerover', () => { btn.setFillStyle(hover); this.tweens.add({ targets: [btn, lbl], scaleX: 1.06, scaleY: 1.06, duration: 70 }); });
    btn.on('pointerout',  () => { btn.setFillStyle(fill);  this.tweens.add({ targets: [btn, lbl], scaleX: 1, scaleY: 1, duration: 70 }); });
    btn.on('pointerdown', onClick);
    return btn;
  }

  _buildControls() {
    const bx = W / 2, by = H / 2 + 128;
    const cw = 480, ch = 46;

    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(bx - cw / 2, by - ch / 2, cw, ch, 5);
    bg.lineStyle(1, 0x333333, 0.6);
    bg.strokeRoundedRect(bx - cw / 2, by - ch / 2, cw, ch, 5);

    const items = [
      ['WASD', 'mover'],
      ['MOUSE1', 'atirar'],
      ['R', 'recarregar'],
      ['ESC', 'pausar'],
    ];
    const totalW = 480;
    const itemW = totalW / items.length;
    items.forEach(([key, action], i) => {
      const ix = bx - totalW / 2 + itemW * i + itemW / 2;
      this.add.text(ix, by - 9, key, txt(FONT.BODY, '#ffd740')).setOrigin(0.5).setDepth(4);
      this.add.text(ix, by + 9, action, txt(FONT.BODY, '#aaaaaa')).setOrigin(0.5).setDepth(4);
    });
  }

  _buildFooter() {
    this.add.text(8, H - 8, 'v1.0', txt(FONT.BODY, '#ffffff33')).setOrigin(0, 1).setDepth(3);
    this.add.text(W - 8, H - 8, 'Burger Royale', txt(FONT.BODY, '#ffffff33')).setOrigin(1, 1).setDepth(3);
  }

  _startGame() {
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t >= 1) this.scene.start('GameScene', { startLevel: 1 });
    });
  }

  update(_, delta) {
    const dt = delta / 1000;
    for (const p of this._particles) {
      p.obj.x += p.vx * dt;
      p.obj.y += p.vy * dt;
      if (p.obj.x < -20)    p.obj.x = W + 20;
      if (p.obj.x > W + 20) p.obj.x = -20;
      if (p.obj.y < -20)    p.obj.y = H + 20;
      if (p.obj.y > H + 20) p.obj.y = -20;
    }
  }
}
