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

    const ps = (sz, col = '#ffffff') => ({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: sz, color: col,
      stroke: '#000000', strokeThickness: 3,
    });

    // ── Painel CORAÇÕES + AMMO + ARMA ──────────────────────
    const lx = 12, ly = 5, lw = 268, lh = 74;
    const lb = s.add.graphics().setDepth(D);
    lb.fillStyle(COLOR.HUD_BG, 0.88); lb.fillRoundedRect(lx, ly, lw, lh, 5);
    lb.lineStyle(1, COLOR.HUD_BORDER, 1); lb.strokeRoundedRect(lx, ly, lw, lh, 5);

    // Corações
    s.add.text(lx + 8, ly + 10, 'HP', ps('7px', '#ff5555')).setDepth(D + 1);
    this._heartGfx = s.add.graphics().setDepth(D + 2);
    this._heartOriginX = lx + 52;
    this._heartOriginY = ly + 7;
    this._drawHearts(PLAYER.MAX_HEARTS);

    // Ammo
    s.add.text(lx + 8, ly + 32, 'AMMO', ps('7px', '#ffdd44')).setDepth(D + 1);
    this._ammoIcons  = [];
    this._ammoDepth  = D + 2;
    this._ammoOriginX = lx + 58;
    this._ammoOriginY = ly + 34;
    this._rebuildAmmoIcons(PLAYER.CLIP_SIZE);
    this._reloadLbl = s.add.text(lx + 58, ly + 34, '', ps('8px', '#ff8800')).setDepth(D + 3);

    // Arma equipada
    s.add.text(lx + 8, ly + 57, 'ARMA', ps('7px', '#aaaaff')).setDepth(D + 1);
    this._weaponTxt = s.add.text(lx + 58, ly + 57, 'PISTOLA', ps('7px', '#ffffff')).setDepth(D + 2);

    // ── Painel PONTOS + ROUND ───────────────────────────────
    const rx = W - 12 - 228, ry = 5, rw = 228, rh = 58;
    const rb = s.add.graphics().setDepth(D);
    rb.fillStyle(COLOR.HUD_BG, 0.88); rb.fillRoundedRect(rx, ry, rw, rh, 5);
    rb.lineStyle(1, COLOR.HUD_BORDER, 1); rb.strokeRoundedRect(rx, ry, rw, rh, 5);

    s.add.text(rx + 8, ry + 8,  'PONTOS', ps('7px', '#ffd740')).setDepth(D + 1);
    this._scoreTxt = s.add.text(rx + rw - 8, ry + 8,  '0', ps('11px', '#ffd740')).setOrigin(1, 0).setDepth(D + 2);
    s.add.text(rx + 8, ry + 32, 'ROUND',  ps('7px', '#ff8800')).setDepth(D + 1);
    this._roundTxt = s.add.text(rx + rw - 8, ry + 32, '1', ps('11px', '#ff8800')).setOrigin(1, 0).setDepth(D + 2);

    // ── Inimigos restantes (centro superior) ────────────────
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

    s.add.text(W / 2, H - 5, 'WASD mover  |  ESPACO atirar  |  R recarregar  |  E mystery box', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px', color: '#ffffff22',
    }).setOrigin(0.5, 1).setDepth(D);
  }

  // Desenha corações pixel art (7×6 px por coração, pixel = 2px)
  _drawHearts(filled) {
    const g  = this._heartGfx;
    const ox = this._heartOriginX;
    const oy = this._heartOriginY;
    const S  = 2;   // tamanho do pixel
    const gap = 20; // espaçamento entre corações

    g.clear();

    for (let i = 0; i < PLAYER.MAX_HEARTS; i++) {
      const x = ox + i * gap;
      const y = oy;
      const alive = i < filled;
      const col   = alive ? 0xff2222 : 0x330000;
      const alpha = alive ? 1.0 : 0.5;

      g.fillStyle(col, alpha);
      // Pixel art de coração (7 cols × 6 linhas):
      //  XX XX
      // XXXXXXX
      // XXXXXXX
      //  XXXXX
      //   XXX
      //    X
      g.fillRect(x + S,     y,       2*S, S);
      g.fillRect(x + 4*S,   y,       2*S, S);
      g.fillRect(x,         y +   S, 7*S, S);
      g.fillRect(x,         y + 2*S, 7*S, S);
      g.fillRect(x +   S,   y + 3*S, 5*S, S);
      g.fillRect(x + 2*S,   y + 4*S, 3*S, S);
      g.fillRect(x + 3*S,   y + 5*S,   S, S);
    }
  }

  _listen() {
    const s = this.scene;
    s.events.on('hearts-changed',    h  => this._setHearts(h));
    s.events.on('score-changed',  sc => this._scoreTxt.setText(sc.toLocaleString('pt-BR')));
    s.events.on('round-changed',  r  => this._roundTxt.setText(String(r)));
    s.events.on('ammo-changed',   a  => this._setAmmo(a));
    s.events.on('reload-start',   () => this._reloadLbl.setText('RECARREGANDO...'));
    s.events.on('reload-done',    () => this._reloadLbl.setText(''));
    s.events.on('show-round-banner', (r, c) => this._showBanner(r, c));
    s.events.on(EVT.WEAPON_CHANGED, key => this._setWeapon(key));
  }

  _setHearts(filled) {
    this._drawHearts(filled);

    // Pulso rápido no painel quando perde coração
    this.scene.tweens.add({
      targets: this._heartGfx,
      scaleX: 1.25, scaleY: 1.25,
      duration: 80, yoyo: true, ease: 'Power2',
    });
  }

  _rebuildAmmoIcons(clipSize) {
    for (const ic of this._ammoIcons) ic.destroy();
    this._ammoIcons = [];
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
    const max = this._ammoIcons.length;
    const pct = ammo / this._currentClip;
    for (let i = 0; i < max; i++) {
      this._ammoIcons[i].fillColor = (i / max) < pct ? COLOR.GOLD_LIGHT : 0x2a2a2a;
    }
  }

  _setWeapon(key) {
    const def = WEAPONS[key];
    if (!def) return;
    this._weaponTxt.setText(def.name);
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
    this._enemyTxt.setText(
      enemyCount > 0 ? `${enemyCount} inimigos restantes` : '',
    );
  }
}
