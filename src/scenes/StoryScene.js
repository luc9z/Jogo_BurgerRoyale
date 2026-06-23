import Phaser from 'phaser';
import { GAME } from '../constants.js';
import { txt, FONT } from '../ui/text.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

// Painéis da abertura — história do Burger Royale: Clown Apocalypse
const PANELS = [
  {
    title: 'BURGERLÂNDIA',
    lines: [
      'Num reino dourado de pão e brasa,',
      'o REI guardava a Receita Sagrada:',
      'o segredo do hambúrguer perfeito.',
    ],
    color: '#ffd740', tint: 0xffd740,
  },
  {
    title: 'A INVEJA',
    lines: [
      'Do outro lado da cidade, o império',
      'rival dos PALHAÇOS cobiçava a receita.',
      'Numa noite, libertaram seu exército.',
    ],
    color: '#ff8833', tint: 0xff8833,
  },
  {
    title: 'O APOCALIPSE',
    lines: [
      'Risadas ecoaram pelas ruas.',
      'A guarda caiu. O castelo foi cercado.',
      'Só restou um defensor de pé...',
    ],
    color: '#ff3344', tint: 0xff3344,
  },
  {
    title: 'O ÚLTIMO REI',
    lines: [
      'Coroa na cabeça, arma em punho.',
      'Sobreviva a 5 ondas do apocalipse',
      'e salve a Receita Sagrada!',
    ],
    color: '#ffd740', tint: 0xffd740,
  },
];

export default class StoryScene extends Phaser.Scene {
  constructor() { super('StoryScene'); }

  preload() {
    if (!this.textures.exists('menu-king'))
      this.load.svg('menu-king', 'assets/sprites/king-idle.svg', { width: 120, height: 180 });
    if (!this.textures.exists('menu-clown'))
      this.load.svg('menu-clown', 'assets/sprites/clown-idle.svg', { width: 120, height: 180 });
  }

  create() {
    this._idx  = 0;
    this._busy = false;
    this._gpPrev = { a: false, b: false, start: false };

    // ── Fundo ──────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x180010, 0x180010, 0x040008, 0x040008, 1);
    bg.fillRect(0, 0, W, H);

    // Brilho central que muda de cor por cena
    this._moodGlow = this.add.graphics().setAlpha(0.16).setBlendMode(Phaser.BlendModes.SCREEN);
    this._drawGlow(0xffd740);
    this.tweens.add({ targets: this._moodGlow, alpha: 0.26, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Brasas subindo
    this._buildEmbers();

    // Personagens (rei firme à esquerda, palhaço ameaçador à direita)
    this._king = this.add.image(W / 2 - 270, H / 2 + 30, 'menu-king').setScale(1.5).setAlpha(0.95);
    this._clown = this.add.image(W / 2 + 270, H / 2 + 30, 'menu-clown').setScale(1.4).setAlpha(0.9);
    this.tweens.add({ targets: this._clown, y: this._clown.y - 12, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this._king, y: this._king.y - 5, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Moldura dupla + cantos ─────────────────────────────
    const fr = this.add.graphics().setDepth(2);
    fr.lineStyle(2, 0xffd740, 0.30); fr.strokeRect(18, 18, W - 36, H - 36);
    fr.lineStyle(1, 0xffd740, 0.12); fr.strokeRect(24, 24, W - 48, H - 48);
    fr.lineStyle(3, 0xffd740, 0.9);
    const cs = 26;
    [[18,18,1,1],[W-18,18,-1,1],[18,H-18,1,-1],[W-18,H-18,-1,-1]].forEach(([x,y,sx,sy]) => {
      fr.lineBetween(x, y, x + sx*cs, y); fr.lineBetween(x, y, x, y + sy*cs);
    });

    // Coroa decorativa acima do título
    this._crown = this.add.graphics().setDepth(4);
    this._drawCrown(W / 2, 86, 0xffd740);

    // ── Faixa + título ─────────────────────────────────────
    this._ribbon = this.add.graphics().setDepth(3);
    this._titleTxt = this.add.text(W / 2, 132, '', txt(FONT.HERO, '#ffd740'))
      .setOrigin(0.5).setDepth(4).setAlpha(0);

    // ── Card de texto ──────────────────────────────────────
    this._card = this.add.graphics().setDepth(3);
    this._lineTxts = [0, 1, 2].map((_, i) =>
      this.add.text(W / 2, H / 2 + 14 + i * 30, '', txt(FONT.BODY, '#f4f4f4'))
        .setOrigin(0.5).setDepth(4).setAlpha(0),
    );

    // ── Progresso (pontos) ─────────────────────────────────
    this._dots = PANELS.map((_, i) =>
      this.add.circle(W / 2 - (PANELS.length - 1) * 11 + i * 22, H - 70, 4, 0x553333).setDepth(4),
    );

    // ── Botões / dicas ─────────────────────────────────────
    this.add.text(W - 38, H - 34, 'PULAR  ▶', txt(FONT.BODY, '#888888'))
      .setOrigin(1, 0.5).setDepth(5).setInteractive({ useHandCursor: true })
      .on('pointerover', function () { this.setColor('#ffffff'); })
      .on('pointerout',  function () { this.setColor('#888888'); })
      .on('pointerdown', () => this._toGame());

    this._hint = this.add.text(W / 2, H - 34, 'CLIQUE / ESPAÇO / A — continuar', txt(FONT.BODY, '#777777'))
      .setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: this._hint, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 });

    // Avançar
    this.input.on('pointerdown', () => this._next());
    this.input.keyboard.on('keydown-SPACE', () => this._next());
    this.input.keyboard.on('keydown-ENTER', () => this._next());
    this.input.keyboard.on('keydown-ESC',   () => this._toGame());

    this._show(0);
  }

  // ── Helpers visuais ──────────────────────────────────────
  _drawGlow(tint) {
    const g = this._moodGlow;
    g.clear();
    g.fillStyle(tint, 1);
    g.fillCircle(W / 2, H / 2 - 10, 300);
  }

  _drawCrown(cx, cy, col) {
    const g = this._crown;
    g.clear();
    g.fillStyle(col, 1);
    g.fillRect(cx - 18, cy, 36, 9);
    g.fillTriangle(cx - 18, cy + 2, cx - 24, cy - 12, cx - 9, cy + 2);
    g.fillTriangle(cx - 6,  cy + 2, cx,      cy - 16, cx + 6, cy + 2);
    g.fillTriangle(cx + 18, cy + 2, cx + 24, cy - 12, cx + 9, cy + 2);
    g.fillStyle(0xff5a3c, 1);
    g.fillCircle(cx - 16, cy - 10, 2.2); g.fillCircle(cx, cy - 14, 2.2); g.fillCircle(cx + 16, cy - 10, 2.2);
  }

  _buildEmbers() {
    this._embers = [];
    for (let i = 0; i < 26; i++) {
      const e = this.add.circle(
        Phaser.Math.Between(30, W - 30), Phaser.Math.Between(0, H),
        Phaser.Math.Between(1, 3), 0xffaa44, Phaser.Math.FloatBetween(0.2, 0.6),
      ).setBlendMode(Phaser.BlendModes.SCREEN).setDepth(1);
      this._embers.push(e);
      this._driftEmber(e);
    }
  }

  _driftEmber(e) {
    const dur = Phaser.Math.Between(5000, 11000);
    const sway = Phaser.Math.Between(-30, 30);
    this.tweens.add({
      targets: e, y: -20, x: e.x + sway, duration: dur, ease: 'Linear',
      onComplete: () => { e.y = H + 20; e.x = Phaser.Math.Between(30, W - 30); this._driftEmber(e); },
    });
    this.tweens.add({ targets: e, alpha: 0, duration: dur, ease: 'Quad.easeIn' });
  }

  _drawRibbon(tint) {
    const g = this._ribbon;
    g.clear();
    const bw = 360, bh = 46, by = 132;
    g.fillStyle(0x0c0008, 0.8); g.fillRoundedRect(W/2 - bw/2, by - bh/2, bw, bh, 8);
    g.lineStyle(2, tint, 0.9);   g.strokeRoundedRect(W/2 - bw/2, by - bh/2, bw, bh, 8);
    // "abas" laterais
    g.fillStyle(tint, 0.9);
    g.fillTriangle(W/2 - bw/2 - 12, by, W/2 - bw/2, by - 8, W/2 - bw/2, by + 8);
    g.fillTriangle(W/2 + bw/2 + 12, by, W/2 + bw/2, by - 8, W/2 + bw/2, by + 8);
  }

  _drawCard(tint) {
    const g = this._card;
    g.clear();
    const cw = 560, ch = 120, cyy = H / 2 + 44;
    g.fillStyle(0x08000a, 0.62); g.fillRoundedRect(W/2 - cw/2, cyy - ch/2, cw, ch, 10);
    g.lineStyle(1, tint, 0.35);  g.strokeRoundedRect(W/2 - cw/2, cyy - ch/2, cw, ch, 10);
  }

  // ── Fluxo ────────────────────────────────────────────────
  _show(i) {
    const p = PANELS[i];
    this._busy = true;
    this._dots.forEach((d, k) => {
      d.setFillStyle(k === i ? p.tint : (k < i ? 0xffd740 : 0x553333));
      d.setScale(k === i ? 1.6 : 1);
    });

    this._drawGlow(p.tint);
    this._drawRibbon(p.tint);
    this._drawCard(p.tint);
    this._drawCrown(W / 2, 86, p.tint);

    // Palhaço cresce e se aproxima conforme a tensão sobe
    const t = i / (PANELS.length - 1);
    this.tweens.add({ targets: this._clown, scale: 1.4 + t * 0.5, x: W/2 + 270 - t * 60, duration: 600, ease: 'Sine.easeInOut' });

    // Título entra
    this._titleTxt.setText(p.title).setColor(p.color).setAlpha(0).setScale(0.7).setY(118);
    this.tweens.add({ targets: this._titleTxt, alpha: 1, scale: 1, y: 132, duration: 420, ease: 'Back.easeOut' });

    // Linhas entram em cascata
    this._lineTxts.forEach((tx, k) => {
      tx.setText(p.lines[k] ?? '').setAlpha(0).setX(W / 2 - 24);
      this.tweens.add({ targets: tx, alpha: 1, x: W / 2, duration: 340, delay: 260 + k * 170, ease: 'Quad.easeOut',
        onComplete: () => { if (k === p.lines.length - 1) this._busy = false; } });
    });
  }

  _next() {
    if (this._busy) {
      this.tweens.killTweensOf(this._titleTxt);
      this._titleTxt.setAlpha(1).setScale(1).setY(132);
      this._lineTxts.forEach(t => { this.tweens.killTweensOf(t); t.setAlpha(1).setX(W / 2); });
      this._busy = false;
      return;
    }
    if (this._idx >= PANELS.length - 1) { this._toGame(); return; }
    this._idx++;
    this._show(this._idx);
  }

  update() {
    const pad = this.input.gamepad?.getPad(0);
    if (!pad) return;
    const now = {
      a:     !!(pad.buttons[0]?.pressed),
      b:     !!(pad.buttons[1]?.pressed),
      start: !!(pad.buttons[9]?.pressed),
    };
    const p = this._gpPrev;
    if (now.a && !p.a) this._next();                    // A = avançar
    if ((now.b && !p.b) || (now.start && !p.start)) this._toGame(); // B/Start = pular
    this._gpPrev = now;
  }

  _toGame() {
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t >= 1) this.scene.start('GameScene', { startLevel: 1 });
    });
  }
}
