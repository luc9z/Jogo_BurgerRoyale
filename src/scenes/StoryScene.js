import Phaser from 'phaser';
import { GAME, COLOR } from '../constants.js';
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
    color: '#ffd740',
  },
  {
    title: 'A INVEJA',
    lines: [
      'Do outro lado da cidade, o império',
      'rival dos PALHAÇOS cobiçava a receita.',
      'Numa noite, libertaram seu exército.',
    ],
    color: '#ff6633',
  },
  {
    title: 'O APOCALIPSE',
    lines: [
      'Risadas ecoaram pelas ruas.',
      'A guarda caiu. O castelo foi cercado.',
      'Só restou um defensor de pé...',
    ],
    color: '#ff2244',
  },
  {
    title: 'O ÚLTIMO REI',
    lines: [
      'Coroa na cabeça, arma em punho.',
      'Sobreviva a 5 ondas do apocalipse',
      'e salve a Receita Sagrada!',
    ],
    color: '#ffd740',
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

    // Fundo sombrio
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x10000a, 0x10000a, 0x05000a, 0x05000a, 1);
    bg.fillRect(0, 0, W, H);
    // brilho central
    const glow = this.add.graphics().setAlpha(0.12).setBlendMode(Phaser.BlendModes.SCREEN);
    glow.fillStyle(0xd4a000, 1);
    glow.fillCircle(W / 2, H / 2, 320);

    // Rei à esquerda, palhaço à direita (silhuetas temáticas)
    this.add.image(W / 2 - 250, H / 2 + 20, 'menu-king').setScale(1.4).setAlpha(0.9);
    const clown = this.add.image(W / 2 + 250, H / 2 + 20, 'menu-clown').setScale(1.4).setAlpha(0.85);
    this.tweens.add({ targets: clown, y: clown.y - 10, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Moldura
    const fr = this.add.graphics();
    fr.lineStyle(2, 0xffd740, 0.25); fr.strokeRect(20, 20, W - 40, H - 40);

    // Textos
    this._titleTxt = this.add.text(W / 2, H / 2 - 80, '', txt(FONT.TITLE, '#ffd740'))
      .setOrigin(0.5).setAlpha(0);
    this._lineTxts = [0, 1, 2].map((_, i) =>
      this.add.text(W / 2, H / 2 - 20 + i * 30, '', txt(FONT.BODY, '#eeeeee'))
        .setOrigin(0.5).setAlpha(0),
    );

    // Indicadores de progresso (pontos)
    this._dots = PANELS.map((_, i) =>
      this.add.circle(W / 2 - (PANELS.length - 1) * 9 + i * 18, H - 56, 4, 0x553333),
    );

    // Botões
    this.add.text(W - 40, H - 30, 'PULAR  ▶', txt(FONT.BODY, '#888888'))
      .setOrigin(1, 0.5).setDepth(5).setInteractive({ useHandCursor: true })
      .on('pointerover', function () { this.setColor('#ffffff'); })
      .on('pointerout',  function () { this.setColor('#888888'); })
      .on('pointerdown', () => this._toGame());

    this._hint = this.add.text(W / 2, H - 30, 'clique ou ESPAÇO para continuar', txt(FONT.BODY, '#666666'))
      .setOrigin(0.5);
    this.tweens.add({ targets: this._hint, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });

    // Avançar
    this.input.on('pointerdown', () => this._next());
    this.input.keyboard.on('keydown-SPACE', () => this._next());
    this.input.keyboard.on('keydown-ENTER', () => this._next());
    this.input.keyboard.on('keydown-ESC',   () => this._toGame());

    this._show(0);
  }

  _show(i) {
    const p = PANELS[i];
    this._busy = true;
    this._dots.forEach((d, k) => d.setFillStyle(k <= i ? 0xffd740 : 0x553333));

    this._titleTxt.setText(p.title).setColor(p.color).setAlpha(0).setY(H / 2 - 80);
    this.tweens.add({ targets: this._titleTxt, alpha: 1, y: H / 2 - 86, duration: 360, ease: 'Back.easeOut' });

    this._lineTxts.forEach((t, k) => {
      t.setText(p.lines[k] ?? '').setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 320, delay: 220 + k * 160,
        onComplete: () => { if (k === p.lines.length - 1) this._busy = false; } });
    });
  }

  _next() {
    if (this._busy) {
      // Revela tudo imediatamente se ainda animando
      this.tweens.killAll();
      this._titleTxt.setAlpha(1).setY(H / 2 - 86);
      this._lineTxts.forEach(t => t.setAlpha(1));
      this._busy = false;
      return;
    }
    if (this._idx >= PANELS.length - 1) { this._toGame(); return; }
    this._idx++;
    this._show(this._idx);
  }

  _toGame() {
    this.cameras.main.fade(350, 0, 0, 0, false, (_, t) => {
      if (t >= 1) this.scene.start('GameScene', { startLevel: 1 });
    });
  }
}
