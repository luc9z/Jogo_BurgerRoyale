import Phaser from 'phaser';
import { GAME, COLOR, MAX_LEVELS, WEAPONS } from '../constants.js';
import { txt, FONT } from '../ui/text.js';
import { getUnlocked, loadSnapshot, isCompleted } from '../systems/progress.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

// Tema de cada fase (cor + nome curto)
const LEVELS = [
  { col: 0x44cc66, name: 'CHEGADA' },
  { col: 0x00aaff, name: 'A HORDA' },
  { col: 0xff8800, name: 'O CHEFE' },
  { col: 0xcc33ff, name: 'CAOS' },
  { col: 0xff2233, name: 'APOCALIPSE' },
];

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  create() {
    this.input.setDefaultCursor('default');
    this._buildBg();

    const unlocked = getUnlocked();

    this.add.text(W / 2, 56, 'SELECIONAR FASE', txt(FONT.TITLE, '#ffd740'))
      .setOrigin(0.5);
    this.add.text(W / 2, 96, isCompleted()
      ? 'campanha concluída — escolha qualquer fase'
      : 'escolha uma fase liberada para continuar', txt(FONT.BODY, '#bbbbbb'))
      .setOrigin(0.5);

    const cardW = 150, gap = 24;
    const totalW = cardW * MAX_LEVELS + gap * (MAX_LEVELS - 1);
    const startX = W / 2 - totalW / 2 + cardW / 2;
    const cardY  = H / 2 + 6;

    for (let i = 0; i < MAX_LEVELS; i++) {
      const level = i + 1;
      this._makeCard(startX + i * (cardW + gap), cardY, cardW, level, level <= unlocked);
    }

    this._backBtn();
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  _buildBg() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x14041a, 0x14041a, 0x05000a, 0x05000a, 1);
    bg.fillRect(0, 0, W, H);
    const g = this.add.graphics().setAlpha(0.08);
    g.lineStyle(1, 0xffd740);
    for (let x = 0; x < W; x += 48) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 48) g.lineBetween(0, y, W, y);
  }

  _makeCard(cx, cy, cw, level, unlocked) {
    const ch   = 210;
    const info = LEVELS[level - 1];
    const col  = unlocked ? info.col : 0x2a2a2a;
    const isBoss = level >= 3;

    const bg = this.add.rectangle(cx, cy, cw, ch, unlocked ? 0x14001e : 0x0a000d)
      .setStrokeStyle(2, col);

    // Faixa superior colorida
    this.add.rectangle(cx, cy - ch / 2 + 26, cw, 52, info.col, unlocked ? 0.16 : 0.04);

    // Número da fase
    this.add.text(cx, cy - ch / 2 + 26, `${level}`,
      txt(FONT.HERO, unlocked ? '#ffffff' : '#3a3a3a')).setOrigin(0.5);

    // Nome / chefe
    this.add.text(cx, cy - 14, info.name,
      txt(FONT.BODY, unlocked ? rgb(info.col) : '#3a3a3a')).setOrigin(0.5);

    if (isBoss) {
      this.add.text(cx, cy + 10, unlocked ? '☠ CHEFE' : '☠',
        txt(FONT.BODY, unlocked ? '#ff5555' : '#3a3a3a')).setOrigin(0.5);
    }

    if (unlocked) {
      // Estado salvo (arma com que você chegou)
      const snap = loadSnapshot(level);
      if (snap?.weaponKey && WEAPONS[snap.weaponKey]) {
        this.add.text(cx, cy + 40, WEAPONS[snap.weaponKey].name,
          txt(FONT.BODY, '#888888')).setOrigin(0.5);
      } else if (level === 1) {
        this.add.text(cx, cy + 40, 'PISTOLA', txt(FONT.BODY, '#888888')).setOrigin(0.5);
      }

      // Botão JOGAR
      const by = cy + ch / 2 - 24;
      this.add.rectangle(cx, by, cw - 28, 30, COLOR.WALL).setStrokeStyle(1, info.col);
      this.add.text(cx, by, 'JOGAR', txt(FONT.BODY, '#ffffff')).setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setFillStyle(0x220038); this.tweens.add({ targets: bg, scaleX: 1.04, scaleY: 1.04, duration: 70 }); });
      bg.on('pointerout',  () => { bg.setFillStyle(0x14001e); this.tweens.add({ targets: bg, scaleX: 1, scaleY: 1, duration: 70 }); });
      bg.on('pointerdown', () => this.scene.start('GameScene', { startLevel: level }));
    } else {
      // Cadeado
      const lk = this.add.graphics();
      lk.fillStyle(0x444444, 1);
      lk.fillRoundedRect(cx - 16, cy + ch / 2 - 44, 32, 26, 4);
      lk.lineStyle(4, 0x444444, 1);
      lk.beginPath();
      lk.arc(cx, cy + ch / 2 - 46, 10, Math.PI, 0, false);
      lk.strokePath();
      this.add.text(cx, cy + ch / 2 - 8, 'BLOQUEADA', txt(FONT.BODY, '#555555')).setOrigin(0.5);
    }
  }

  _backBtn() {
    const btn = this.add.text(40, H - 30, '←  VOLTAR', txt(FONT.BODY, '#888888'))
      .setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ffd740'));
    btn.on('pointerout',  () => btn.setColor('#888888'));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}

// hex int → '#rrggbb'
function rgb(int) {
  return '#' + int.toString(16).padStart(6, '0');
}
