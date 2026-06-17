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
  { key: 'revolver',      label: 'REVÓLVER',        line1: '78 dano  ·  6 tiros',    line2: 'preciso, cadência média',  cost: 550, color: 0xcc6600 },
  { key: 'shotgun',       label: 'ESCOPETA',        line1: '30×5 ·  6 tiros',        line2: 'devastador de perto',      cost: 480, color: 0xff6600 },
  { key: 'machinegun',    label: 'METRALHADORA',    line1: '13 dano  ·  35 balas',   line2: 'disparo contínuo',         cost: 700, color: 0x44ffaa },
  { key: 'sniper',        label: 'SNIPER',          line1: '180 dano  ·  5 tiros',   line2: 'alcance máximo, letal',    cost: 850, color: 0x00aaff },
  { key: 'burst',         label: 'BURST',           line1: '38×3 ·  21 balas',       line2: 'rajada de 3 precisa',      cost: 620, color: 0xffaa00 },
  { key: 'laser',         label: 'LASER',           line1: '55 dano  ·  16 tiros',   line2: 'velocidade máxima',        cost: 780, color: 0x00ffee },
  { key: 'doubleshotgun', label: 'ESCOPETA DUPLA',  line1: '28×8 ·  4 tiros',        line2: 'caos total de perto',      cost: 720, color: 0xff4400 },
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
    const bg = this.add.graphics().setDepth(DEPTH.OVERLAY);
    bg.fillGradientStyle(0x14041a, 0x14041a, 0x05000a, 0x05000a, 0.92);
    bg.fillRect(0, 0, W, H);
    // Brilho dourado atrás do cabeçalho
    const glow = this.add.graphics().setDepth(DEPTH.OVERLAY).setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    glow.fillStyle(0xd4a000, 1);
    glow.fillCircle(W/2, 80, 260);
    // Moldura dupla
    const g = this.add.graphics().setDepth(DEPTH.OVERLAY + 1);
    g.lineStyle(2, 0xffd740, 0.3);
    g.strokeRect(16, 16, W - 32, H - 32);
    g.lineStyle(1, 0xffd740, 0.12);
    g.strokeRect(22, 22, W - 44, H - 44);
  }

  _buildHeader() {
    const D = DEPTH.OVERLAY + 2;
    const { round = 1, score = 0, hearts = PLAYER.MAX_HEARTS } = this._data;

    this.add.text(W/2, 48, `ROUND  ${round}  COMPLETO!`, ps('22px', '#ffd740', 9))
      .setOrigin(0.5).setDepth(D);

    this.add.text(W/2, 94, 'ESCOLHA UMA MELHORIA:', ps('8px', '#bbbbbb', 4))
      .setOrigin(0.5).setDepth(D);

    // Pontos e corações
    const hAlive = '♥'.repeat(hearts);
    const hDead  = '♡'.repeat(Math.max(0, PLAYER.MAX_HEARTS - hearts));
    this.add.text(W/2 - 12, 122, `${score.toLocaleString('pt-BR')} pts`, ps('8px', '#ffd740', 3))
      .setOrigin(1, 0.5).setDepth(D);
    this.add.text(W/2 + 12, 122, hAlive + hDead, ps('12px', '#ff2244', 3))
      .setOrigin(0, 0.5).setDepth(D);
  }

  _buildCards() {
    const { score = 0, hearts = PLAYER.MAX_HEARTS, currentWeapon = 'pistol' } = this._data;
    const D = DEPTH.OVERLAY + 2;

    const options = this._pickOptions(hearts, score, currentWeapon);
    const n       = options.length;
    const cardW   = 210, cardH = 240, gap = 18;
    const totalW  = cardW * n + gap * (n - 1);
    const startX  = W/2 - totalW/2 + cardW/2;
    const cardY   = H/2 + 44;

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
    const fillCol = canAfford ? 0x14001e : 0x0a000d;
    const bordCol = canAfford ? opt.color : 0x2a2a2a;
    const alpha   = canAfford ? 1 : 0.28;

    // Fundo principal
    const bg = this.add.rectangle(cx, cy, cw, ch, fillCol)
      .setStrokeStyle(2, bordCol)
      .setDepth(D + 1);

    // Faixa de cor no topo (header)
    const headerH = 80;
    this.add.rectangle(cx, cy - ch/2 + headerH/2, cw, headerH, opt.color, canAfford ? 0.14 : 0.04)
      .setDepth(D + 2);

    // Linha separadora abaixo do header
    const g = this.add.graphics().setDepth(D + 2);
    g.lineStyle(1, opt.color, canAfford ? 0.5 : 0.12);
    g.lineBetween(cx - cw/2 + 12, cy - ch/2 + headerH, cx + cw/2 - 12, cy - ch/2 + headerH);

    // Ícone da arma / bônus desenhado
    this._drawCardIcon(g, cx, cy - ch/2 + headerH/2, opt.key, opt.color, alpha, D);

    // Nome
    const nameY = cy - ch/2 + headerH + 22;
    this.add.text(cx, nameY, opt.label,
      ps('8px', canAfford ? '#ffffff' : '#3a3a3a', 3))
      .setOrigin(0.5).setDepth(D + 3);

    // Linha de detalhe 1
    if (opt.line1) {
      this.add.text(cx, nameY + 26, opt.line1,
        ps('8px', canAfford ? '#cccccc' : '#2a2a2a', 2))
        .setOrigin(0.5).setDepth(D + 3);
    }

    // Linha de detalhe 2
    if (opt.line2) {
      this.add.text(cx, nameY + 46, opt.line2,
        ps('8px', canAfford ? '#888888' : '#1e1e1e', 2))
        .setOrigin(0.5).setDepth(D + 3);
    }

    // Custo
    const costY   = cy + ch/2 - 30;
    const costCol = opt.cost === 0 ? '#44ff88' : canAfford ? '#ffd740' : '#882222';
    const costStr = opt.cost === 0 ? 'GRÁTIS' : `${opt.cost} pts`;
    this.add.text(cx, costY, costStr, ps('8px', costCol, 4))
      .setOrigin(0.5).setDepth(D + 3);

    if (!canAfford && opt.cost > 0) {
      this.add.text(cx, costY + 18, 'SEM PONTOS', ps('8px', '#881111', 2))
        .setOrigin(0.5).setDepth(D + 3);
    }

    if (canAfford) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        bg.setFillStyle(0x220038);
        bg.setStrokeStyle(2, opt.color);
        this.tweens.add({ targets: bg, scaleX: 1.04, scaleY: 1.04, duration: 70 });
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

  _drawCardIcon(g, cx, cy, key, col, alpha, D) {
    // Desenha ícone 2D visto de lado, apontando para a direita
    const a = alpha;

    // Retângulo horizontal auxiliar (x=esquerda, y=topo)
    const rect = (x, y, w, h, c) => {
      g.fillStyle(c, a);
      g.fillTriangle(x, y, x+w, y, x+w, y+h);
      g.fillTriangle(x, y, x+w, y+h, x, y+h);
    };

    switch (key) {
      // ── ARMAS ─────────────────────────────────────────────
      case 'pistol':
        rect(cx-18, cy-4, 12, 8, 0x666666);         // corpo
        rect(cx-6,  cy-3, 20, 5, 0xbbbbbb);         // cano
        rect(cx-14, cy+4, 9,  11, 0x444444);        // grip
        g.fillStyle(0xdddddd, a); g.fillRect(cx-7, cy-2, 2, 4); // slide detail
        break;

      case 'revolver':
        rect(cx-16, cy-4, 11, 7, 0x774411);         // corpo
        g.fillStyle(0xeeaa33, a); g.fillCircle(cx-7, cy-1, 7); // cilindro
        g.lineStyle(1, 0x995522, a); g.strokeCircle(cx-7, cy-1, 7);
        g.fillStyle(0xcc7722, a); g.fillCircle(cx-7, cy-1, 3); // centro cil.
        rect(cx+1,  cy-3, 22, 5, 0xddaa44);         // cano longo
        rect(cx-14, cy+3, 9,  11, 0x552200);        // grip
        break;

      case 'shotgun':
        rect(cx-18, cy-5, 15, 9, 0x6b3311);         // corpo (pump)
        rect(cx-3,  cy-4, 22, 7, 0xcc9966);         // cano duplo
        rect(cx-3,  cy-6, 22, 3, 0xddaa77);         // cano superior
        rect(cx-18, cy+4, 10, 10, 0x553322);        // grip
        g.fillStyle(0x884422, a); g.fillRect(cx-3, cy-2, 2, 2); // detalhes
        break;

      case 'machinegun':
        rect(cx-20, cy-4, 16, 8, 0x1a6633);         // corpo
        rect(cx-4,  cy-3, 30, 5, 0x44cc77);         // cano longo
        rect(cx-15, cy+4, 8,  12, 0x115522);        // carregador
        rect(cx-20, cy-5, 6,  6, 0x228844);         // coronha stub
        g.lineStyle(1, 0x55ee88, a * 0.4);
        g.lineBetween(cx-3, cy-2, cx+24, cy-2);     // reflexo cano
        break;

      case 'sniper':
        rect(cx-22, cy-3, 18, 6, 0x1a4488);         // coronha
        rect(cx-4,  cy-2, 36, 4, 0x55aaee);         // cano longo
        rect(cx-10, cy-9, 16, 5, 0x223355);         // luneta
        g.fillStyle(0x77ccff, a); g.fillCircle(cx-3, cy-7, 3); // lente
        g.lineStyle(1, 0x88ddff, a * 0.6);
        g.lineBetween(cx-3, cy-1, cx+30, cy-1);     // reflexo
        break;

      case 'burst':
        rect(cx-14, cy-4, 12, 7, 0xcc6600);         // corpo
        rect(cx-2,  cy-3, 20, 5, 0xffbb44);         // cano
        rect(cx-14, cy+3, 8,  10, 0x884400);        // grip
        // 3 linhas indicando rajada
        g.lineStyle(1.5, 0xffdd88, a * 0.7);
        g.lineBetween(cx+18, cy-3, cx+22, cy-5);
        g.lineBetween(cx+18, cy,   cx+22, cy);
        g.lineBetween(cx+18, cy+3, cx+22, cy+5);
        break;

      case 'laser':
        rect(cx-18, cy-2, 14, 5, 0x007788);         // corpo
        rect(cx-4,  cy-1, 36, 3, 0x00ffee);         // cano laser
        g.fillStyle(0x00ffee, a * 0.5);
        g.fillRect(cx+30, cy-1, 8, 3);              // efeito feixe
        g.lineStyle(1.5, 0x88ffff, a * 0.5);
        g.lineBetween(cx-3, cy, cx+38, cy);
        break;

      case 'doubleshotgun':
        rect(cx-18, cy-7, 14, 8, 0x883322);         // corpo
        rect(cx-4,  cy-6, 20, 6, 0xff7744);         // cano sup
        rect(cx-4,  cy,   20, 6, 0xff7744);         // cano inf
        rect(cx-18, cy+1, 10, 9, 0x662211);         // grip
        break;

      // ── BÔNUS ─────────────────────────────────────────────
      case 'heal':
        g.fillStyle(col, a);
        g.fillCircle(cx-6, cy-2, 9);
        g.fillCircle(cx+6, cy-2, 9);
        g.fillTriangle(cx-13, cy+5, cx+13, cy+5, cx, cy+16);
        g.fillStyle(0xffffff, a * 0.3);
        g.fillCircle(cx-8, cy-5, 4);
        break;

      case 'speed': {
        // Relâmpago
        g.fillStyle(col, a);
        g.fillTriangle(cx+5, cy-16, cx-10, cy+2, cx+1, cy+2);
        g.fillTriangle(cx-5, cy+16, cx+10, cy-2, cx-1, cy-2);
        g.fillStyle(0xffffff, a * 0.4);
        g.fillTriangle(cx+5, cy-16, cx-2, cy+2, cx+1, cy+2);
        break;
      }

      case 'damage': {
        // Explosão / estrela de 6 pontas
        const R = 16, r = 8;
        for (let i = 0; i < 6; i++) {
          const a1 = (i / 6) * Math.PI * 2 - Math.PI/2;
          const a2 = ((i + 0.5) / 6) * Math.PI * 2 - Math.PI/2;
          const a3 = ((i + 1) / 6) * Math.PI * 2 - Math.PI/2;
          g.fillStyle(col, a);
          g.fillTriangle(
            cx + Math.cos(a1)*R, cy + Math.sin(a1)*R,
            cx + Math.cos(a2)*r, cy + Math.sin(a2)*r,
            cx + Math.cos(a3)*R, cy + Math.sin(a3)*R,
          );
          g.fillTriangle(
            cx, cy,
            cx + Math.cos(a1)*R, cy + Math.sin(a1)*R,
            cx + Math.cos(a3)*R, cy + Math.sin(a3)*R,
          );
        }
        g.fillStyle(0xffffff, a * 0.5);
        g.fillCircle(cx, cy, 5);
        break;
      }

      case 'reload':
        g.lineStyle(5, col, a);
        g.beginPath();
        g.arc(cx, cy, 13, -Math.PI*0.9, Math.PI*0.5, false);
        g.strokePath();
        // ponta da seta
        g.fillStyle(col, a);
        g.fillTriangle(cx-1, cy-13, cx+9, cy-8, cx+1, cy-6);
        break;

      default:
        // Fallback: círculo
        g.fillStyle(col, a);
        g.fillCircle(cx, cy, 14);
    }
  }

  _buildSkip() {
    const skip = this.add.text(W/2, H - 40, 'PULAR  →', ps('8px', '#444444', 2))
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
