import Phaser from 'phaser';
import { GAME, COLOR } from '../constants.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

const ps = (sz, col = '#ffffff', thick = 5) => ({
  fontFamily: '"Press Start 2P", monospace',
  fontSize: sz, color: col,
  stroke: '#000000', strokeThickness: thick,
});

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this._buildBackground();
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
    glow.fillCircle(W/2, H/2 - 60, 320);
    glow.setBlendMode(Phaser.BlendModes.SCREEN);

    // Grade em perspectiva no "chão"
    const g = this.add.graphics().setAlpha(0.10);
    g.lineStyle(1, 0xffd740);
    for (let x = 0; x < W; x += 48) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 48) g.lineBetween(0, y, W, y);

    // Vinheta: bordas escurecidas
    const vig = this.add.graphics();
    vig.fillStyle(0x000000, 0.55);
    vig.fillRect(0, 0, W, 60);
    vig.fillRect(0, H - 60, W, 60);
    vig.fillRect(0, 0, 60, H);
    vig.fillRect(W - 60, 0, 60, H);

    // Partículas decorativas (bolinhas flutuando que representam balas/palhaços)
    const cols = [0xff2200, 0xffd740, 0xff8800, 0x22cc44, 0x00aaff, 0xcc00ff];
    this._particles = [];
    for (let i = 0; i < 18; i++) {
      const x  = Phaser.Math.Between(0, W);
      const y  = Phaser.Math.Between(0, H);
      const r  = Phaser.Math.Between(3, 9);
      const c  = cols[i % cols.length];
      const a  = 0.08 + Math.random() * 0.14;
      const obj = this.add.circle(x, y, r, c, a);
      const vx  = (Math.random() - 0.5) * 30;
      const vy  = (Math.random() - 0.5) * 25;
      this._particles.push({ obj, vx, vy });
    }
  }

  _buildTitle() {
    // Brilho atrás do título
    const glow = this.add.rectangle(W/2, H/2 - 128, 560, 70, 0xd4a000, 0.06);
    this.tweens.add({
      targets: glow, alpha: 0.14, duration: 1100,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const title = this.add.text(W/2, H/2 - 130, 'BURGER ROYALE', {
      ...ps('28px', '#ffd740', 10),
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title, scaleX: 1.025, scaleY: 1.025,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(W/2, H/2 - 92, 'CLOWN APOCALYPSE', {
      ...ps('8px', '#cc3300', 4),
    }).setOrigin(0.5);

    // Linha separadora decorativa
    const sep = this.add.graphics();
    sep.lineStyle(1, 0xd4a000, 0.5);
    sep.lineBetween(W/2 - 220, H/2 - 70, W/2 + 220, H/2 - 70);
    sep.fillStyle(0xffd740, 0.8);
    sep.fillRect(W/2 - 5, H/2 - 73, 10, 6);
  }

  _buildBestScore() {
    const best = parseInt(localStorage.getItem('burgerRoyale_best') || '0');
    if (best > 0) {
      this.add.text(W/2, H/2 - 50, `RECORDE: ${best.toLocaleString('pt-BR')} pts`, {
        ...ps('8px', '#ff8800', 3),
      }).setOrigin(0.5);
    } else {
      this.add.text(W/2, H/2 - 50, 'Sem recorde ainda — seja o primeiro!', {
        ...ps('8px', '#555555', 2),
      }).setOrigin(0.5);
    }
  }

  _buildPlayButton() {
    const btn = this.add.rectangle(W/2, H/2 + 14, 280, 46, COLOR.WALL)
      .setStrokeStyle(3, COLOR.WALL_GLOW)
      .setInteractive({ useHandCursor: true });

    const btnTxt = this.add.text(W/2, H/2 + 14, 'JOGAR', {
      ...ps('12px', '#ffffff', 5),
    }).setOrigin(0.5);

    btn.on('pointerover', () => {
      btn.setFillStyle(0xbb1800);
      this.tweens.add({ targets: [btn, btnTxt], scaleX: 1.06, scaleY: 1.06, duration: 70 });
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(COLOR.WALL);
      this.tweens.add({ targets: [btn, btnTxt], scaleX: 1, scaleY: 1, duration: 70 });
    });
    btn.on('pointerdown', () => this._startGame());

    // "Pressione ESPAÇO" piscando como alternativa
    const hint = this.add.text(W/2, H/2 + 56, 'ou pressione ESPAÇO', {
      ...ps('8px', '#ffffff55', 2),
    }).setOrigin(0.5);

    this.tweens.add({
      targets: hint, alpha: 0.1,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _buildControls() {
    const bx = W/2, by = H/2 + 100;
    const cw = 480, ch = 44;

    // Caixa de controles
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(bx - cw/2, by - ch/2, cw, ch, 5);
    bg.lineStyle(1, 0x333333, 0.6);
    bg.strokeRoundedRect(bx - cw/2, by - ch/2, cw, ch, 5);

    const items = [
      ['WASD', 'mover'],
      ['MOUSE1', 'atirar'],
      ['R', 'recarregar'],
      ['ESC', 'pausar'],
    ];

    const totalW = 480;
    const itemW  = totalW / items.length;
    items.forEach(([key, action], i) => {
      const ix = bx - totalW/2 + itemW * i + itemW/2;
      this.add.text(ix, by - 8, key,    { ...ps('8px', '#ffd740', 2) }).setOrigin(0.5);
      this.add.text(ix, by + 8, action, { ...ps('8px', '#aaaaaa', 1) }).setOrigin(0.5);
    });
  }

  _buildFooter() {
    this.add.text(8, H - 8, 'v1.0', {
      ...ps('8px', '#ffffff22', 0),
    }).setOrigin(0, 1);

    this.add.text(W - 8, H - 8, 'Burger Royale', {
      ...ps('8px', '#ffffff22', 0),
    }).setOrigin(1, 1);
  }

  _startGame() {
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t >= 1) this.scene.start('GameScene');
    });
  }

  update(_, delta) {
    const dt = delta / 1000;
    for (const p of this._particles) {
      p.obj.x += p.vx * dt;
      p.obj.y += p.vy * dt;
      if (p.obj.x < -20)    { p.obj.x = W + 20; }
      if (p.obj.x > W + 20) { p.obj.x = -20; }
      if (p.obj.y < -20)    { p.obj.y = H + 20; }
      if (p.obj.y > H + 20) { p.obj.y = -20; }
    }
  }
}
