import Phaser from 'phaser';
import { GAME, WEAPONS, PLAYER, DEPTH } from '../constants.js';
import { txt, FONT } from '../ui/text.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

const ps = txt;

// Armas via upgrade. tier = posição na escada — só aparecem armas de tier
// MAIOR que a equipada, então a evolução é sempre crescente (nunca volta).
const WEAPON_POOL = [
  { key: 'revolver',      label: 'REVÓLVER',       tier: 1, line1: '62 dano · 6 tiros',     line2: 'preciso, longo alcance', cost: 420,  color: 0xeeaa44 },
  { key: 'shotgun',       label: 'ESCOPETA',       tier: 2, line1: '24×6 · 7 tiros',        line2: 'devastador de perto',    cost: 520,  color: 0xff7a33 },
  { key: 'burst',         label: 'BURST',          tier: 3, line1: '30×3 · 24 balas',       line2: 'rajada precisa de 3',    cost: 640,  color: 0xffaa00 },
  { key: 'machinegun',    label: 'METRALHADORA',   tier: 4, line1: '16 dano · 40 balas',    line2: 'disparo contínuo',       cost: 760,  color: 0x44ffaa },
  { key: 'sniper',        label: 'SNIPER',         tier: 5, line1: '210 dano · 5 tiros',    line2: 'alcance máximo, letal',  cost: 900,  color: 0x66bbff },
  { key: 'doubleshotgun', label: 'ESCOPETA DUPLA', tier: 6, line1: '26×8 · 8 tiros',        line2: 'caos total de perto',    cost: 1050, color: 0xff5533 },
  { key: 'laser',         label: 'LASER',          tier: 7, line1: '72 dano · instantâneo', line2: 'feixe que atravessa',    cost: 1200, color: 0x00ffee },
];

// Bônus não relacionados a arma
const BONUS_POOL = [
  { key: 'heal',   label: 'CURAR',      line1: 'recupera 1 coração',    line2: '',                    cost: 300, color: 0xff2244 },
  { key: 'speed',  label: 'ADRENALINA', line1: '+25 velocidade',        line2: 'permanente',          cost: 350, color: 0xffd740 },
  { key: 'damage', label: 'DANO+',      line1: '+20% dano em tudo',     line2: 'permanente, empilha', cost: 600, color: 0xff8800 },
  { key: 'reload', label: 'RECARGA+',   line1: '-25% tempo de recarga', line2: 'permanente',          cost: 420, color: 0x88ffcc },
];

const ICON_KEYS = ['pistol', 'revolver', 'shotgun', 'burst', 'machinegun', 'sniper', 'doubleshotgun', 'laser'];

export default class UpgradeScene extends Phaser.Scene {
  constructor() { super('UpgradeScene'); }

  preload() {
    for (const k of ICON_KEYS) {
      const key = `wicon-${k}`;
      if (!this.textures.exists(key)) this.load.svg(key, `assets/icons/${k}.svg`, { width: 128, height: 128 });
    }
  }

  // DEVE ser init, não create — scene.launch() passa dados aqui
  init(data) {
    this._data   = data ?? {};
    this._chosen = false;
  }

  create() {
    this.input.setDefaultCursor('default');
    this._buildBg();
    this._buildHeader();
    this._gpCards    = [];
    this._gpIdx      = 0;
    this._gpPrevs    = { left: false, right: false, a: false, b: false };
    this._gpEnabled  = false;
    this._selectorT  = 0;
    // Delay 400ms antes de aceitar input do controle —
    // evita botão A pressionado (atirar) se propagar pro upgrade
    this.time.delayedCall(400, () => {
      const p = this.input.gamepad?.getPad(0);
      this._gpPrevs = {
        left:  !!(p?.buttons[14]?.pressed),
        right: !!(p?.buttons[15]?.pressed),
        a:     !!(p?.buttons[0]?.pressed),
        b:     !!(p?.buttons[1]?.pressed),
      };
      this._gpEnabled = true;
    });
    this._selector   = this.add.graphics().setDepth(DEPTH.OVERLAY + 5);
    this._buildCards();
    this._buildSkip();
    this._drawSelector();
  }

  _buildBg() {
    const bg = this.add.graphics().setDepth(DEPTH.OVERLAY);
    bg.fillGradientStyle(0x14041a, 0x14041a, 0x05000a, 0x05000a, 0.92);
    bg.fillRect(0, 0, W, H);
    // Brilho dourado atrás do cabeçalho
    const glow = this.add.graphics().setDepth(DEPTH.OVERLAY).setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    glow.fillStyle(0xd4a000, 1);
    glow.fillCircle(W / 2, 80, 260);
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

    this.add.text(W / 2, 48, `ROUND  ${round}  COMPLETO!`, ps(FONT.TITLE, '#ffd740'))
      .setOrigin(0.5).setDepth(D);

    this.add.text(W / 2, 92, 'ESCOLHA UMA MELHORIA:', ps(FONT.BODY, '#bbbbbb'))
      .setOrigin(0.5).setDepth(D);

    // Pontos e corações
    const hAlive = '♥'.repeat(hearts);
    const hDead  = '♡'.repeat(Math.max(0, PLAYER.MAX_HEARTS - hearts));
    this.add.text(W / 2 - 12, 120, `${score.toLocaleString('pt-BR')} pts`, ps(FONT.BODY, '#ffd740'))
      .setOrigin(1, 0.5).setDepth(D);
    this.add.text(W / 2 + 12, 120, hAlive + hDead, ps(FONT.VALUE, '#ff2244'))
      .setOrigin(0, 0.5).setDepth(D);
  }

  _buildCards() {
    const { score = 0, hearts = PLAYER.MAX_HEARTS, currentWeapon = 'pistol' } = this._data;
    const D = DEPTH.OVERLAY + 2;

    const options = this._pickOptions(hearts, score, currentWeapon);
    const n       = options.length;
    const cardW   = 210, cardH = 240, gap = 18;
    const totalW  = cardW * n + gap * (n - 1);
    const startX  = W / 2 - totalW / 2 + cardW / 2;
    const cardY   = H / 2 + 44;

    options.forEach((opt, i) => {
      this._makeCard(startX + i * (cardW + gap), cardY, cardW, cardH, opt, score >= opt.cost, D);
    });
  }

  _pickOptions(hearts, score, currentWeapon) {
    const curTier = WEAPONS[currentWeapon]?.tier ?? 0;

    // Só armas ACIMA do tier atual → evolução sempre crescente, nunca repete.
    const upgrades = WEAPON_POOL.filter(w => w.tier > curTier).sort((a, b) => a.tier - b.tier);

    let weapon = null;
    if (upgrades.length) {
      // próxima da escada, ou a seguinte (pequeno salto) — mantém variedade
      weapon = Phaser.Utils.Array.GetRandom(upgrades.slice(0, 2));
    }

    const bonusPool = Phaser.Utils.Array.Shuffle(
      BONUS_POOL.filter(b => !(b.key === 'heal' && hearts >= PLAYER.MAX_HEARTS))
    );

    // 1 arma (se houver upgrade) + bônus até completar 3 cartas
    const need    = weapon ? 2 : 3;
    const bonuses = bonusPool.slice(0, need);
    const out     = [weapon, ...bonuses].filter(Boolean);

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
    const iconCY  = cy - ch / 2 + headerH / 2;
    this.add.rectangle(cx, iconCY, cw, headerH, opt.color, canAfford ? 0.14 : 0.04)
      .setDepth(D + 2);

    // Linha separadora abaixo do header
    const g = this.add.graphics().setDepth(D + 2);
    g.lineStyle(1, opt.color, canAfford ? 0.5 : 0.12);
    g.lineBetween(cx - cw / 2 + 12, cy - ch / 2 + headerH, cx + cw / 2 - 12, cy - ch / 2 + headerH);

    // Ícone: armas usam SVG da biblioteca (game-icons), bônus são desenhados
    const isWeapon = opt.key in WEAPONS;
    const iconTex  = `wicon-${opt.key}`;
    if (isWeapon && this.textures.exists(iconTex)) {
      const img = this.add.image(cx, iconCY, iconTex).setDisplaySize(54, 54).setDepth(D + 3);
      img.setTint(canAfford ? opt.color : 0x3a3a3a);
      if (!canAfford) img.setAlpha(0.4);
    } else {
      this._drawCardIcon(g, cx, iconCY, opt.key, opt.color, alpha, D);
    }

    // Nome
    const nameY = cy - ch / 2 + headerH + 22;
    this.add.text(cx, nameY, opt.label, ps(FONT.BODY, canAfford ? '#ffffff' : '#3a3a3a'))
      .setOrigin(0.5).setDepth(D + 3);

    // Linha de detalhe 1
    if (opt.line1) {
      this.add.text(cx, nameY + 26, opt.line1, ps(FONT.BODY, canAfford ? '#cccccc' : '#2a2a2a'))
        .setOrigin(0.5).setDepth(D + 3);
    }

    // Linha de detalhe 2
    if (opt.line2) {
      this.add.text(cx, nameY + 46, opt.line2, ps(FONT.BODY, canAfford ? '#888888' : '#1e1e1e'))
        .setOrigin(0.5).setDepth(D + 3);
    }

    // Custo
    const costY   = cy + ch / 2 - 30;
    const costCol = opt.cost === 0 ? '#44ff88' : canAfford ? '#ffd740' : '#882222';
    const costStr = opt.cost === 0 ? 'GRÁTIS' : `${opt.cost} pts`;
    this.add.text(cx, costY, costStr, ps(FONT.BODY, costCol))
      .setOrigin(0.5).setDepth(D + 3);

    if (!canAfford && opt.cost > 0) {
      this.add.text(cx, costY + 18, 'SEM PONTOS', ps(FONT.BODY, '#881111'))
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

      this._gpCards.push({ bg, opt, cx, cy, cw, ch, fillCol, bordCol });
    }
  }

  // Ícones desenhados — usados apenas pelos BÔNUS (armas vêm de SVG)
  _drawCardIcon(g, cx, cy, key, col, alpha, D) {
    const a = alpha;
    switch (key) {
      case 'heal':
        g.fillStyle(col, a);
        g.fillCircle(cx - 6, cy - 2, 9);
        g.fillCircle(cx + 6, cy - 2, 9);
        g.fillTriangle(cx - 13, cy + 5, cx + 13, cy + 5, cx, cy + 16);
        g.fillStyle(0xffffff, a * 0.3);
        g.fillCircle(cx - 8, cy - 5, 4);
        break;

      case 'speed': {
        g.fillStyle(col, a);
        g.fillTriangle(cx + 5, cy - 16, cx - 10, cy + 2, cx + 1, cy + 2);
        g.fillTriangle(cx - 5, cy + 16, cx + 10, cy - 2, cx - 1, cy - 2);
        g.fillStyle(0xffffff, a * 0.4);
        g.fillTriangle(cx + 5, cy - 16, cx - 2, cy + 2, cx + 1, cy + 2);
        break;
      }

      case 'damage': {
        const R = 16, r = 8;
        for (let i = 0; i < 6; i++) {
          const a1 = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const a2 = ((i + 0.5) / 6) * Math.PI * 2 - Math.PI / 2;
          const a3 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
          g.fillStyle(col, a);
          g.fillTriangle(
            cx + Math.cos(a1) * R, cy + Math.sin(a1) * R,
            cx + Math.cos(a2) * r, cy + Math.sin(a2) * r,
            cx + Math.cos(a3) * R, cy + Math.sin(a3) * R,
          );
          g.fillTriangle(
            cx, cy,
            cx + Math.cos(a1) * R, cy + Math.sin(a1) * R,
            cx + Math.cos(a3) * R, cy + Math.sin(a3) * R,
          );
        }
        g.fillStyle(0xffffff, a * 0.5);
        g.fillCircle(cx, cy, 5);
        break;
      }

      case 'reload':
        g.lineStyle(5, col, a);
        g.beginPath();
        g.arc(cx, cy, 13, -Math.PI * 0.9, Math.PI * 0.5, false);
        g.strokePath();
        g.fillStyle(col, a);
        g.fillTriangle(cx - 1, cy - 13, cx + 9, cy - 8, cx + 1, cy - 6);
        break;

      default:
        g.fillStyle(col, a);
        g.fillCircle(cx, cy, 14);
    }
  }

  _buildSkip() {
    const skip = this.add.text(W / 2, H - 40, 'PULAR  →', ps(FONT.BODY, '#444444'))
      .setOrigin(0.5).setDepth(DEPTH.OVERLAY + 3)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerover', () => skip.setColor('#999999'));
    skip.on('pointerout',  () => skip.setColor('#444444'));
    skip.on('pointerdown', () => {
      if (!this._chosen) { this._chosen = true; this._choose(null); }
    });
  }

  _drawSelector() {
    this._selector.clear();
    if (this._gpCards.length === 0) return;
    const c = this._gpCards[this._gpIdx];
    this._selector.lineStyle(3, c.opt.color, 1);
    this._selector.strokeRect(c.cx - c.cw / 2 - 5, c.cy - c.ch / 2 - 5, c.cw + 10, c.ch + 10);
    // Pequenos cantos decorativos
    const lx = c.cx - c.cw / 2 - 5, ty = c.cy - c.ch / 2 - 5;
    const rx = lx + c.cw + 10,       by = ty + c.ch + 10;
    const cs = 10;
    this._selector.lineStyle(4, 0xffffff, 0.8);
    [[lx,ty,1,1],[rx,ty,-1,1],[lx,by,1,-1],[rx,by,-1,-1]].forEach(([ox,oy,sx,sy]) => {
      this._selector.lineBetween(ox, oy, ox + sx*cs, oy);
      this._selector.lineBetween(ox, oy, ox, oy + sy*cs);
    });
  }

  update(_, delta) {
    if (this._chosen || !this._gpEnabled) return;
    const pad = this.input.gamepad?.getPad(0);
    if (!pad || this._gpCards.length === 0) return;

    const lx = pad.leftStick?.x ?? 0;
    const now = {
      left:  !!(pad.buttons[14]?.pressed) || lx < -0.5,
      right: !!(pad.buttons[15]?.pressed) || lx >  0.5,
      a:     !!(pad.buttons[0]?.pressed),
      b:     !!(pad.buttons[1]?.pressed),
    };
    const prev = this._gpPrevs;

    if (now.left  && !prev.left)  { this._gpIdx = (this._gpIdx - 1 + this._gpCards.length) % this._gpCards.length; this._drawSelector(); }
    if (now.right && !prev.right) { this._gpIdx = (this._gpIdx + 1) % this._gpCards.length; this._drawSelector(); }
    if (now.a     && !prev.a)     { this._chosen = true; this._choose(this._gpCards[this._gpIdx].opt); }
    if (now.b     && !prev.b)     { this._chosen = true; this._choose(null); }

    this._gpPrevs = now;

    // Pulsa o seletor
    this._selectorT += delta;
    this._selector.setAlpha(0.65 + 0.35 * Math.sin(this._selectorT * 0.005));
  }

  _choose(upgrade) {
    const gs = this.scene.get('GameScene');
    if (upgrade) gs.applyUpgrade(upgrade);
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
