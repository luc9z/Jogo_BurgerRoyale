import { GAME, PLAYER, COLOR, DEPTH, WEAPONS, EVT } from '../constants.js';
import { txt, FONT } from './text.js';

const WEAPON_COLOR = {
  pistol:       0x999999,
  revolver:     0xaa8833,
  shotgun:      0xff6600,
  machinegun:   0x44ffaa,
  sniper:       0x4488cc,
  burst:        0xffaa00,
  laser:        0x00ffee,
  doubleshotgun:0xff4400,
};

export default class HUD {
  constructor(scene) {
    this.scene = scene;
    this._build();
    this._listen();
  }

  _build() {
    const s = this.scene;
    const { WIDTH: W, HEIGHT: H } = GAME;
    const D = DEPTH.HUD;
    this._D = D;

    const ps = txt;

    // ── Painel esquerdo ─────────────────────────────────────
    const lx = 10, ly = 4, lw = 285, lh = 100;
    const lb = s.add.graphics().setDepth(D);
    lb.fillStyle(COLOR.HUD_BG, 0.92); lb.fillRoundedRect(lx, ly, lw, lh, 6);
    lb.lineStyle(1.5, COLOR.HUD_BORDER, 1); lb.strokeRoundedRect(lx, ly, lw, lh, 6);
    this._lx = lx; this._ly = ly; this._lw = lw;

    // ── Corações ────────────────────────────────────────────
    s.add.text(lx + 8, ly + 12, 'HP', ps(FONT.BODY, '#ff5555')).setDepth(D + 1);
    this._heartGfx     = s.add.graphics().setDepth(D + 2);
    this._heartOriginX = lx + 48;
    this._heartOriginY = ly + 8;
    this._drawHearts(PLAYER.MAX_HEARTS);

    // ── Ammo ────────────────────────────────────────────────
    s.add.text(lx + 8, ly + 38, 'AMMO', ps(FONT.BODY, '#ffdd44')).setDepth(D + 1);
    this._ammoIcons   = [];
    this._ammoDepth   = D + 2;
    this._ammoOriginX = lx + 64;
    this._ammoOriginY = ly + 40;
    this._rebuildAmmoIcons(WEAPONS.pistol.clipSize);
    this._reloadLbl = s.add.text(lx + 64, ly + 40, '', ps(FONT.BODY, '#ff8800')).setDepth(D + 3);

    // ── Arma atual ──────────────────────────────────────────
    s.add.text(lx + 8, ly + 68, 'ARMA', ps(FONT.BODY, '#aaaaff')).setDepth(D + 1);

    this._weaponDot = s.add.circle(lx + 64, ly + 72, 5, 0x999999, 1).setDepth(D + 2);

    this._weaponNameTxt = s.add.text(lx + 76, ly + 68, 'PISTOLA', ps(FONT.BODY, '#ffffff'))
      .setDepth(D + 3);

    // ── Painel direito (pontos + round) ─────────────────────
    const rx = W - 12 - 240, ry = 4, rw = 240, rh = 68;
    const rb = s.add.graphics().setDepth(D);
    rb.fillStyle(COLOR.HUD_BG, 0.92); rb.fillRoundedRect(rx, ry, rw, rh, 6);
    rb.lineStyle(1.5, COLOR.HUD_BORDER, 1); rb.strokeRoundedRect(rx, ry, rw, rh, 6);

    s.add.text(rx + 10, ry + 10, 'PONTOS', ps(FONT.BODY, '#ffd740')).setDepth(D + 1);
    this._scoreTxt = s.add.text(rx + rw - 10, ry + 10, '0', ps(FONT.VALUE, '#ffd740')).setOrigin(1, 0).setDepth(D + 2);
    s.add.text(rx + 10, ry + 40, 'ROUND',  ps(FONT.BODY, '#ff8800')).setDepth(D + 1);
    this._roundTxt = s.add.text(rx + rw - 10, ry + 40, '1', ps(FONT.VALUE, '#ff8800')).setOrigin(1, 0).setDepth(D + 2);

    // ── Inimigos restantes ──────────────────────────────────
    this._enemyTxt = s.add.text(W / 2, 14, '', txt(FONT.BODY, '#ff5555'))
      .setOrigin(0.5, 0).setDepth(D + 1);

    // ── Banners ─────────────────────────────────────────────
    this._banner = s.add.text(W / 2, H / 2 - 40, '', txt(FONT.TITLE, '#ffd740'))
      .setOrigin(0.5).setDepth(DEPTH.BANNER).setAlpha(0);

    this._bannerSub = s.add.text(W / 2, H / 2 + 14, '', txt(FONT.BODY, '#ff8800'))
      .setOrigin(0.5).setDepth(DEPTH.BANNER).setAlpha(0);

    s.add.text(W / 2, H - 5, 'WASD mover  |  MOUSE1 atirar  |  R recarregar', txt(FONT.BODY, '#ffffff22'))
      .setOrigin(0.5, 1).setDepth(D);
  }

  // ── Corações pixel art ───────────────────────────────────
  _drawHearts(filled) {
    const g  = this._heartGfx;
    const ox = this._heartOriginX;
    const oy = this._heartOriginY;
    const S  = 2;
    const gap = 22;
    g.clear();
    for (let i = 0; i < PLAYER.MAX_HEARTS; i++) {
      const x     = ox + i * gap;
      const alive = i < filled;
      g.fillStyle(alive ? 0xff2222 : 0x330000, alive ? 1 : 0.5);
      g.fillRect(x + S,   oy,       2*S, S);
      g.fillRect(x + 4*S, oy,       2*S, S);
      g.fillRect(x,       oy +   S, 7*S, S);
      g.fillRect(x,       oy + 2*S, 7*S, S);
      g.fillRect(x +   S, oy + 3*S, 5*S, S);
      g.fillRect(x + 2*S, oy + 4*S, 3*S, S);
      g.fillRect(x + 3*S, oy + 5*S,   S, S);
    }
  }

  // ── Ammo ─────────────────────────────────────────────────
  _rebuildAmmoIcons(clipSize) {
    for (const ic of this._ammoIcons) ic.destroy();
    this._ammoIcons = [];
    if (clipSize <= 0) { this._currentClip = 1; return; }
    const max = Math.min(clipSize, 20);
    const gap = max <= 10 ? 16 : 8;
    for (let i = 0; i < max; i++) {
      const ic = this.scene.add.rectangle(
        this._ammoOriginX + i * gap, this._ammoOriginY,
        gap <= 8 ? 6 : 11, 11, COLOR.GOLD_LIGHT,
      ).setOrigin(0, 0).setDepth(this._ammoDepth);
      this._ammoIcons.push(ic);
    }
    this._currentClip = clipSize;
  }

  _setAmmo(ammo) {
    if (ammo === -1) {
      for (const ic of this._ammoIcons) ic.setVisible(false);
      this._reloadLbl.setText('∞');
      return;
    }
    this._reloadLbl.setText('');
    for (const ic of this._ammoIcons) ic.setVisible(true);
    const max = this._ammoIcons.length;
    const pct = ammo / this._currentClip;
    for (let i = 0; i < max; i++) {
      this._ammoIcons[i].fillColor = (i / max) < pct ? COLOR.GOLD_LIGHT : 0x2a2a2a;
    }
  }

  // ── Eventos ──────────────────────────────────────────────
  // IMPORTANTE: scene.events SOBREVIVE ao scene.restart() (JOGAR NOVAMENTE).
  // Sem remover no shutdown, cada reinício empilha um HUD novo cujos listeners
  // apontam para textos já destruídos → HUD quebra / erros. Guardamos refs e
  // limpamos no shutdown.
  _listen() {
    const s = this.scene;
    const h = this._handlers = {
      'hearts-changed':    n      => this._setHearts(n),
      'score-changed':     sc     => this._scoreTxt.setText(sc.toLocaleString('pt-BR')),
      'round-changed':     r      => this._roundTxt.setText(String(r)),
      'ammo-changed':      a      => this._setAmmo(a),
      'reload-start':      ()     => { if (this._reloadLbl.text !== '∞') this._reloadLbl.setText('RECARREGANDO...'); },
      'reload-done':       ()     => { if (this._reloadLbl.text !== '∞') this._reloadLbl.setText(''); },
      'show-round-banner': (r, c) => this._showBanner(r, c),
      [EVT.WEAPON_CHANGED]: key   => this._onWeaponChanged(key),
    };
    for (const evt in h) s.events.on(evt, h[evt]);

    s.events.once('shutdown', () => {
      for (const evt in h) s.events.off(evt, h[evt]);
    });
  }

  _setHearts(filled) {
    this._drawHearts(filled);
    this.scene.tweens.add({
      targets: this._heartGfx,
      scaleX: 1.25, scaleY: 1.25,
      duration: 80, yoyo: true, ease: 'Power2',
    });
  }

  _onWeaponChanged(key) {
    const def = WEAPONS[key];
    if (!def) return;
    this._rebuildAmmoIcons(def.isMelee ? -1 : def.clipSize);
    this._weaponNameTxt?.setText(def.name);
    this._weaponDot?.setFillStyle(WEAPON_COLOR[key] ?? 0x999999, 1);
  }

  _showBanner(round, count) {
    this._banner.setText(`ROUND  ${round}`);
    this._bannerSub.setText(`${count} palhacos se aproximando...`);
    this.scene.tweens.add({ targets: [this._banner, this._bannerSub], alpha: 1, duration: 380 });
    this.scene.time.delayedCall(2700, () => {
      this.scene.tweens.add({ targets: [this._banner, this._bannerSub], alpha: 0, duration: 420 });
    });
  }

  showRoundClear(round) {
    this._banner.setText(`ROUND ${round}  COMPLETO!`);
    this._bannerSub.setText('Escolhendo melhoria...');
    this.scene.tweens.add({
      targets: [this._banner, this._bannerSub], alpha: 1, duration: 350,
      onComplete: () => {
        this.scene.time.delayedCall(1400, () => {
          this.scene.tweens.add({ targets: [this._banner, this._bannerSub], alpha: 0, duration: 350 });
        });
      },
    });
  }

  update(ammo, enemyCount) {
    this._setAmmo(ammo);
    this._enemyTxt.setText(enemyCount > 0 ? `${enemyCount} inimigos restantes` : '');
  }
}
