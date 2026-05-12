import { GAME, PLAYER, COLOR, DEPTH, WEAPONS, EVT } from '../constants.js';

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

    const ps = (sz, col = '#ffffff') => ({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: sz, color: col,
      stroke: '#000000', strokeThickness: 3,
    });

    // ── Painel esquerdo ─────────────────────────────────────
    const lx = 12, ly = 5, lw = 275, lh = 84;
    const lb = s.add.graphics().setDepth(D);
    lb.fillStyle(COLOR.HUD_BG, 0.88); lb.fillRoundedRect(lx, ly, lw, lh, 5);
    lb.lineStyle(1, COLOR.HUD_BORDER, 1); lb.strokeRoundedRect(lx, ly, lw, lh, 5);
    this._lx = lx; this._ly = ly; this._lw = lw;

    // ── Corações ────────────────────────────────────────────
    s.add.text(lx + 8, ly + 10, 'HP', ps('7px', '#ff5555')).setDepth(D + 1);
    this._heartGfx     = s.add.graphics().setDepth(D + 2);
    this._heartOriginX = lx + 44;
    this._heartOriginY = ly + 7;
    this._drawHearts(PLAYER.MAX_HEARTS);

    // ── Ammo ────────────────────────────────────────────────
    s.add.text(lx + 8, ly + 32, 'AMMO', ps('7px', '#ffdd44')).setDepth(D + 1);
    this._ammoIcons   = [];
    this._ammoDepth   = D + 2;
    this._ammoOriginX = lx + 58;
    this._ammoOriginY = ly + 34;
    this._rebuildAmmoIcons(PLAYER.CLIP_SIZE);
    this._reloadLbl = s.add.text(lx + 58, ly + 34, '', ps('8px', '#ff8800')).setDepth(D + 3);

    // ── Slots de arma (Q para trocar) ───────────────────────
    s.add.text(lx + 8, ly + 58, 'ARMAS', ps('6px', '#aaaaff')).setDepth(D + 1);

    const slotY  = ly + 54;
    const slotH  = 22;
    const slotW  = 104;
    const slotX1 = lx + 60;
    const slotX2 = slotX1 + slotW + 22; // gap para "Q"

    // Slot 0 (faca)
    this._slot0Bg  = s.add.rectangle(slotX1, slotY, slotW, slotH, 0x110015).setOrigin(0, 0).setDepth(D + 1);
    this._slot0Brd = s.add.graphics().setDepth(D + 2);
    this._slot0Txt = s.add.text(slotX1 + 6, slotY + 11, 'FACA', ps('6px', '#ffffff')).setOrigin(0, 0.5).setDepth(D + 3);

    // Label Q entre os slots
    s.add.text(slotX1 + slotW + 11, slotY + 11, 'Q', ps('6px', '#888888')).setOrigin(0.5, 0.5).setDepth(D + 2);

    // Slot 1 (arma do box)
    this._slot1Bg  = s.add.rectangle(slotX2, slotY, slotW, slotH, 0x110015).setOrigin(0, 0).setDepth(D + 1);
    this._slot1Brd = s.add.graphics().setDepth(D + 2);
    this._slot1Txt = s.add.text(slotX2 + 6, slotY + 11, '---', ps('6px', '#444444')).setOrigin(0, 0.5).setDepth(D + 3);

    this._slotMeta = { x: [slotX1, slotX2], w: slotW, h: slotH, y: slotY };

    // ── Painel direito (pontos + round) ─────────────────────
    const rx = W - 12 - 228, ry = 5, rw = 228, rh = 58;
    const rb = s.add.graphics().setDepth(D);
    rb.fillStyle(COLOR.HUD_BG, 0.88); rb.fillRoundedRect(rx, ry, rw, rh, 5);
    rb.lineStyle(1, COLOR.HUD_BORDER, 1); rb.strokeRoundedRect(rx, ry, rw, rh, 5);

    s.add.text(rx + 8, ry + 8,  'PONTOS', ps('7px', '#ffd740')).setDepth(D + 1);
    this._scoreTxt = s.add.text(rx + rw - 8, ry + 8,  '0', ps('11px', '#ffd740')).setOrigin(1, 0).setDepth(D + 2);
    s.add.text(rx + 8, ry + 32, 'ROUND',  ps('7px', '#ff8800')).setDepth(D + 1);
    this._roundTxt = s.add.text(rx + rw - 8, ry + 32, '1', ps('11px', '#ff8800')).setOrigin(1, 0).setDepth(D + 2);

    // ── Inimigos restantes ──────────────────────────────────
    this._enemyTxt = s.add.text(W / 2, 12, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px', color: '#ff5555',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(D + 1);

    // ── Banners ─────────────────────────────────────────────
    this._banner = s.add.text(W / 2, H / 2 - 38, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '26px', color: '#ffd740',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(DEPTH.BANNER).setAlpha(0);

    this._bannerSub = s.add.text(W / 2, H / 2 + 12, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px', color: '#ff8800',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.BANNER).setAlpha(0);

    s.add.text(W / 2, H - 5, 'WASD mover  |  ESPACO atacar  |  R recarregar  |  Q trocar arma  |  E mystery box', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px', color: '#ffffff22',
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

  // ── Slots ────────────────────────────────────────────────
  _updateSlots(slots, activeSlot) {
    const D  = this._D;
    const m  = this._slotMeta;
    const bgs  = [this._slot0Bg,  this._slot1Bg];
    const brds = [this._slot0Brd, this._slot1Brd];
    const txts = [this._slot0Txt, this._slot1Txt];

    for (let i = 0; i < 2; i++) {
      const key    = slots[i];
      const active = i === activeSlot;
      const def    = key ? WEAPONS[key] : null;
      const label  = def ? def.name : '---';
      const col    = !def ? '#333333' : active ? '#ffffff' : '#888888';

      bgs[i].setFillStyle(active ? 0x1a0030 : 0x0a000f);
      txts[i].setText(label).setColor(col);

      brds[i].clear();
      if (active) {
        brds[i].lineStyle(2, 0xffd740, 1);
      } else if (def) {
        brds[i].lineStyle(1, 0x444444, 0.8);
      } else {
        brds[i].lineStyle(1, 0x222222, 0.5);
      }
      brds[i].strokeRect(m.x[i], m.y, m.w, m.h);
    }
  }

  // ── Ammo ─────────────────────────────────────────────────
  _rebuildAmmoIcons(clipSize) {
    for (const ic of this._ammoIcons) ic.destroy();
    this._ammoIcons = [];
    if (clipSize === -1) { this._currentClip = 1; return; } // faca — sem ícones
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
      // Faca: esconde ícones, mostra "∞"
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
    s.events.on('hearts-changed',    h        => this._setHearts(h));
    s.events.on('score-changed',     sc       => this._scoreTxt.setText(sc.toLocaleString('pt-BR')));
    s.events.on('round-changed',     r        => this._roundTxt.setText(String(r)));
    s.events.on('ammo-changed',      a        => this._setAmmo(a));
    s.events.on('reload-start',      ()       => { if (this._reloadLbl.text !== '∞') this._reloadLbl.setText('RECARREGANDO...'); });
    s.events.on('reload-done',       ()       => { if (this._reloadLbl.text !== '∞') this._reloadLbl.setText(''); });
    s.events.on('show-round-banner', (r, c)   => this._showBanner(r, c));
    s.events.on(EVT.WEAPON_CHANGED,  key      => this._onWeaponChanged(key));
    s.events.on('slots-changed',     (sl, as) => this._updateSlots(sl, as));
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
    this._rebuildAmmoIcons(def.clipSize);
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
    this._bannerSub.setText('Proxima horda chegando...');
    this.scene.tweens.add({
      targets: [this._banner, this._bannerSub], alpha: 1, duration: 350,
      onComplete: () => {
        this.scene.time.delayedCall(2200, () => {
          this.scene.tweens.add({ targets: [this._banner, this._bannerSub], alpha: 0, duration: 400 });
        });
      },
    });
  }

  update(ammo, enemyCount) {
    this._setAmmo(ammo);
    this._enemyTxt.setText(enemyCount > 0 ? `${enemyCount} inimigos restantes` : '');
  }
}
