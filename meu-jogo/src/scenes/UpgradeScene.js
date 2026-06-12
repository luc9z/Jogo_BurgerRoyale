import Phaser from 'phaser';
import { GAME, WEAPONS, PLAYER, DEPTH } from '../constants.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

const ps = (sz, col = '#ffffff', thick = 4) => ({
  fontFamily: '"Press Start 2P", monospace',
  fontSize: sz, color: col,
  stroke: '#000000', strokeThickness: thick,
});

// Armas disponíveis via upgrade (sem pistola — é a inicial, sempre inferior)
const WEAPON_POOL = [
  { key: 'revolver',    label: 'REVÓLVER',     line1: '78 dano  ·  6 tiros',    line2: 'preciso, cadência média', cost: 550, color: 0xcc6600 },
  { key: 'shotgun',     label: 'ESCOPETA',     line1: '30 × 5 perdig.',          line2: 'devastador de perto',    cost: 480, color: 0xff6600 },
  { key: 'machinegun',  label: 'METRALHADORA', line1: '13 dano  ·  35 balas',    line2: 'disparo contínuo',       cost: 700, color: 0x44ffaa },
  { key: 'sniper',      label: 'SNIPER',       line1: '95 dano  ·  3 tiros',     line2: 'alcance máximo',         cost: 850, color: 0x00aaff },
];

// Bônus não relacionados a arma
const BONUS_POOL = [
  { key: 'heal',   label: 'CURAR',        line1: 'recupera 1 coração',      line2: '',                  cost: 300, color: 0xff2244 },
  { key: 'speed',  label: 'ADRENALINA',   line1: '+25 velocidade',          line2: 'permanente',         cost: 350, color: 0xffd740 },
  { key: 'damage', label: 'DANO+',        line1: '+20% dano em tudo',       line2: 'permanente, empilha', cost: 600, color: 0xff8800 },
  { key: 'reload', label: 'RECARGA+',     line1: '-25% tempo de recarga',   line2: 'permanente',         cost: 420, color: 0x88ffcc },
];

export default class UpgradeScene extends Phaser.Scene {
  constructor() { super('UpgradeScene'); }

  // DEVE ser init, não create — scene.launch() passa dados aqui
  init(data) {
    this._data   = data ?? {};
    this._chosen = false;
  }

  create() {
    this.input.setDefaultCursor('default');
    this._buildBg();
    this._buildHeader();
    this._buildCards();
    this._buildSkip();
  }

  _buildBg() {
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.88).setDepth(DEPTH.OVERLAY);
    const g = this.add.graphics().setDepth(DEPTH.OVERLAY + 1);
    g.lineStyle(2, 0xffd740, 0.22);
    g.strokeRect(16, 16, W - 32, H - 32);
  }

  _buildHeader() {
    const D = DEPTH.OVERLAY + 2;
    const { round = 1, score = 0, hearts = PLAYER.MAX_HEARTS } = this._data;

    this.add.text(W/2, 48, `ROUND  ${round}  COMPLETO!`, ps('22px', '#ffd740', 9))
      .setOrigin(0.5).setDepth(D);

    this.add.text(W/2, 94, 'ESCOLHA UMA MELHORIA:', ps('10px', '#bbbbbb', 4))
      .setOrigin(0.5).setDepth(D);

    // Pontos e corações
    const hAlive = '♥'.repeat(hearts);
    const hDead  = '♡'.repeat(Math.max(0, PLAYER.MAX_HEARTS - hearts));
    this.add.text(W/2 - 12, 122, `${score.toLocaleString('pt-BR')} pts`, ps('9px', '#ffd740', 3))
      .setOrigin(1, 0.5).setDepth(D);
    this.add.text(W/2 + 12, 122, hAlive + hDead, ps('13px', '#ff2244', 3))
      .setOrigin(0, 0.5).setDepth(D);
  }

  _buildCards() {
    const { score = 0, hearts = PLAYER.MAX_HEARTS, currentWeapon = 'pistol' } = this._data;
    const D = DEPTH.OVERLAY + 2;

    const options = this._pickOptions(hearts, score, currentWeapon);
    const n       = options.length;
    const cardW   = 200, cardH = 200, gap = 20;
    const totalW  = cardW * n + gap * (n - 1);
    const startX  = W/2 - totalW/2 + cardW/2;
    const cardY   = H/2 + 38;

    options.forEach((opt, i) => {
      this._makeCard(startX + i * (cardW + gap), cardY, cardW, cardH, opt, score >= opt.cost, D);
    });
  }

  _pickOptions(hearts, score, currentWeapon) {
    // 1 arma garantida (diferente da atual), 2 bônus aleatórios
    const weaponPool = Phaser.Utils.Array.Shuffle(
      [...WEAPON_POOL.filter(w => w.key !== currentWeapon)]
    );
    const weapon = weaponPool[0];

    const bonusPool = Phaser.Utils.Array.Shuffle(
      BONUS_POOL.filter(b => {
        if (b.key === 'heal' && hearts >= PLAYER.MAX_HEARTS) return false;
        return true;
      })
    );
    const bonuses = bonusPool.slice(0, 2);

    // Garante 3 opções: 1 arma + 2 bônus. Fallback se não houver bônus suficiente
    const out = [weapon, ...bonuses].filter(Boolean);

    // Preenche com mais armas se necessário
    if (out.length < 3 && weaponPool.length > 1) {
      out.push(weaponPool[1]);
    }

    return Phaser.Utils.Array.Shuffle(out).slice(0, 3);
  }

  _makeCard(cx, cy, cw, ch, opt, canAfford, D) {
    const fillCol = canAfford ? 0x180028 : 0x0d000e;
    const bordCol = canAfford ? opt.color : 0x2a2a2a;

    const bg = this.add.rectangle(cx, cy, cw, ch, fillCol)
      .setStrokeStyle(2, bordCol)
      .setDepth(D + 1);

    // Faixa de cor no topo
    this.add.rectangle(cx, cy - ch/2 + 18, cw, 36, opt.color, canAfford ? 0.18 : 0.05)
      .setDepth(D + 2);

    // Ícone colorido
    this.add.circle(cx, cy - ch/2 + 18, 11, opt.color, canAfford ? 1 : 0.2)
      .setDepth(D + 3);

    // Nome da opção
    this.add.text(cx, cy - ch/2 + 54, opt.label, ps('9px', canAfford ? '#ffffff' : '#444444', 3))
      .setOrigin(0.5).setDepth(D + 3);

    // Linha de detalhe 1
    if (opt.line1) {
      this.add.text(cx, cy - ch/2 + 82, opt.line1, ps('7px', canAfford ? '#aaaaaa' : '#333333', 2))
        .setOrigin(0.5).setDepth(D + 3);
    }

    // Linha de detalhe 2
    if (opt.line2) {
      this.add.text(cx, cy - ch/2 + 102, opt.line2, ps('6px', canAfford ? '#777777' : '#252525', 2))
        .setOrigin(0.5).setDepth(D + 3);
    }

    // Custo
    const costY   = cy + ch/2 - 38;
    const costCol = opt.cost === 0 ? '#44ff88' : canAfford ? '#ffd740' : '#882222';
    const costStr = opt.cost === 0 ? 'GRÁTIS' : `${opt.cost} pts`;
    this.add.text(cx, costY, costStr, ps('11px', costCol, 4))
      .setOrigin(0.5).setDepth(D + 3);

    if (!canAfford && opt.cost > 0) {
      this.add.text(cx, costY + 26, 'SEM PONTOS', ps('7px', '#882222', 2))
        .setOrigin(0.5).setDepth(D + 3);
    }

    if (canAfford) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        bg.setFillStyle(0x260042);
        this.tweens.add({ targets: bg, scaleX: 1.05, scaleY: 1.05, duration: 70 });
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(fillCol);
        this.tweens.add({ targets: bg, scaleX: 1, scaleY: 1, duration: 70 });
      });
      bg.on('pointerdown', () => {
        if (!this._chosen) { this._chosen = true; this._choose(opt); }
      });
    }
  }

  _buildSkip() {
    const skip = this.add.text(W/2, H - 40, 'PULAR  →', ps('9px', '#444444', 2))
      .setOrigin(0.5).setDepth(DEPTH.OVERLAY + 3)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerover', () => skip.setColor('#999999'));
    skip.on('pointerout',  () => skip.setColor('#444444'));
    skip.on('pointerdown', () => {
      if (!this._chosen) { this._chosen = true; this._choose(null); }
    });
  }

  _choose(upgrade) {
    const gs = this.scene.get('GameScene');
    if (upgrade) gs.applyUpgrade(upgrade);
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
