import { GAME, PLAYER, COLOR, DEPTH, WEAPONS, EVT } from '../constants.js';

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

    const ps = (sz, col = '#ffffff', stroke = 4) => ({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: sz, color: col,
      stroke: '#000000', strokeThickness: stroke,
    });

    // ── Painel esquerdo ─────────────────────────────────────
    const lx = 10, ly = 4, lw = 285, lh = 100;
    const lb = s.add.graphics().setDepth(D);
    lb.fillStyle(COLOR.HUD_BG, 0.92); lb.fillRoundedRect(lx, ly, lw, lh, 6);
    lb.lineStyle(1.5, COLOR.HUD_BORDER, 1); lb.strokeRoundedRect(lx, ly, lw, lh, 6);
    this._lx = lx; this._ly = ly; this._lw = lw;

    // ── Corações ────────────────────────────────────────────
    s.add.text(lx + 8, ly + 12, 'HP', ps('8px', '#ff5555')).setDepth(D + 1);
    this._heartGfx     = s.add.graphics().setDepth(D + 2);
    this._heartOriginX = lx + 48;
    this._heartOriginY = ly + 8;
    this._drawHearts(PLAYER.MAX_HEARTS);

    // ── Ammo ────────────────────────────────────────────────
    s.add.text(lx + 8, ly + 38, 'AMMO', ps('8px', '#ffdd44')).setDepth(D + 1);
    this._ammoIcons   = [];
    this._ammoDepth   = D + 2;
    this._ammoOriginX = lx + 64;
    this._ammoOriginY = ly + 40;
    this._rebuildAmmoIcons(WEAPONS.pistol.clipSize);
    this._reloadLbl = s.add.text(lx + 64, ly + 40, '', ps('8px', '#ff8800')).setDepth(D + 3);

    // ── Arma atual ──────────────────────────────────────────
    s.add.text(lx + 8, ly + 68, 'ARMA', ps('8px', '#aaaaff')).setDepth(D + 1);

    this._weaponDot = s.add.circle(lx + 64, ly + 72, 5, 0x999999, 1).setDepth(D + 2);

    this._weaponNameTxt = s.add.text(lx + 76, ly + 68, 'PISTOLA', ps('8px', '#ffffff', 3))
      .setDepth(D + 3);

    // ── Painel direito (pontos + round) ─────────────────────
    const rx = W - 12 - 240, ry = 4, rw = 240, rh = 68;
    const rb = s.add.graphics().setDepth(D);
    rb.fillStyle(COLOR.HUD_BG, 0.92); rb.fillRoundedRect(rx, ry, rw, rh, 6);
    rb.lineStyle(1.5, COLOR.HUD_BORDER, 1); rb.strokeRoundedRect(rx, ry, rw, rh, 6);

    s.add.text(rx + 10, ry + 10, 'PONTOS', ps('8px', '#ffd740')).setDepth(D + 1);
    this._scoreTxt = s.add.text(rx + rw - 10, ry + 10, '0', ps('12px', '#ffd740')).setOrigin(1, 0).setDepth(D + 2);
    s.add.text(rx + 10, ry + 40, 'ROUND',  ps('8px', '#ff8800')).setDepth(D + 1);
    this._roundTxt = s.add.text(rx + rw - 10, ry + 40, '1', ps('12px', '#ff8800')).setOrigin(1, 0).setDepth(D + 2);

    // ── Inimigos restantes ──────────────────────────────────
    this._enemyTxt = s.add.text(W / 2, 14, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px', color: '#ff5555',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(D + 1);

    // ── Banners ─────────────────────────────────────────────
    this._banner = s.add.text(W / 2, H / 2 - 40, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '28px', color: '#ffd740',
      stroke: '#000000', strokeThickness: 9,
    }).setOrigin(0.5).setDepth(DEPTH.BANNER).setAlpha(0);

    this._bannerSub = s.add.text(W / 2, H / 2 + 14, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px', color: '#ff8800',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.BANNER).setAlpha(0);

    s.add.text(W / 2, H - 5, 'WASD mover  |  MOUSE1 atirar  |  R recarregar', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px', color: '#ffffff22',
    }).setOrigin(0.5, 1).setDepth(D);
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
  _listen() {
    const s = this.scene;
    s.events.on('hearts-changed',    h      => this._setHearts(h));
    s.events.on('score-changed',     sc     => this._scoreTxt.setText(sc.toLocaleString('pt-BR')));
    s.events.on('round-changed',     r      => this._roundTxt.setText(String(r)));
    s.events.on('ammo-changed',      a      => this._setAmmo(a));
    s.events.on('reload-start',      ()     => { if (this._reloadLbl.text !== '∞') this._reloadLbl.setText('RECARREGANDO...'); });
    s.events.on('reload-done',       ()     => { if (this._reloadLbl.text !== '∞') this._reloadLbl.setText(''); });
    s.events.on('show-round-banner', (r, c) => this._showBanner(r, c));
    s.events.on(EVT.WEAPON_CHANGED,  key    => this._onWeaponChanged(key));
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
