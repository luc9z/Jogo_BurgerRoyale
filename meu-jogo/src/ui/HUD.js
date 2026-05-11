import { GAME, PLAYER, COLOR, DEPTH } from '../constants.js';

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

    // Estilo base da fonte pixel (sem emoji)
    const ps = (sz, col = '#ffffff') => ({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: sz, color: col,
      stroke: '#000000', strokeThickness: 3,
    });

    // ── Painel VIDA + AMMO ──────────────────────────────────
    const lx = 12, ly = 5, lw = 268, lh = 58;
    const lb = s.add.graphics().setDepth(D);
    lb.fillStyle(COLOR.HUD_BG, 0.88); lb.fillRoundedRect(lx, ly, lw, lh, 5);
    lb.lineStyle(1, COLOR.HUD_BORDER, 1); lb.strokeRoundedRect(lx, ly, lw, lh, 5);

    // Vida
    s.add.text(lx + 8, ly + 7, 'VIDA', ps('7px', '#ff5555')).setDepth(D + 1);
    const hbx = lx + 58, hby = ly + 8, hbw = 174, hbh = 12;
    s.add.rectangle(hbx + hbw / 2, hby + hbh / 2, hbw, hbh, 0x330000).setDepth(D + 1);
    this._hpBar  = s.add.rectangle(hbx, hby, hbw, hbh, COLOR.GREEN).setOrigin(0, 0).setDepth(D + 2);
    this._hpText = s.add.text(hbx + hbw + 5, hby, '100', ps('9px')).setOrigin(0, 0).setDepth(D + 2);

    // Ammo
    s.add.text(lx + 8, ly + 32, 'AMMO', ps('7px', '#ffdd44')).setDepth(D + 1);
    this._ammoIcons = [];
    for (let i = 0; i < PLAYER.CLIP_SIZE; i++) {
      const ic = s.add.rectangle(lx + 58 + i * 16, ly + 34, 11, 11, COLOR.GOLD_LIGHT)
        .setOrigin(0, 0).setDepth(D + 2);
      this._ammoIcons.push(ic);
    }
    this._reloadLbl = s.add.text(lx + 58, ly + 34, '', ps('8px', '#ff8800')).setDepth(D + 2);

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

    // Dica de controles
    s.add.text(W / 2, H - 5, 'WASD mover  |  ESPACO atirar  |  R recarregar', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px', color: '#ffffff22',
    }).setOrigin(0.5, 1).setDepth(D);
  }

  _listen() {
    const s = this.scene;
    s.events.on('player-health-changed', hp  => this._setHP(hp));
    s.events.on('score-changed',  sc => this._scoreTxt.setText(sc.toLocaleString('pt-BR')));
    s.events.on('round-changed',  r  => this._roundTxt.setText(String(r)));
    s.events.on('ammo-changed',   a  => this._setAmmo(a));
    s.events.on('reload-start',   () => this._reloadLbl.setText('RECARREGANDO...'));
    s.events.on('reload-done',    () => this._reloadLbl.setText(''));
    s.events.on('show-round-banner', (r, c) => this._showBanner(r, c));
  }

  _setHP(hp) {
    const pct = Math.max(0, hp / 100);
    this._hpBar.width     = 174 * pct;
    this._hpBar.fillColor = pct > 0.5 ? COLOR.GREEN : pct > 0.25 ? COLOR.ORANGE : COLOR.RED;
    this._hpText.setText(String(Math.ceil(hp)));
  }

  _setAmmo(ammo) {
    for (let i = 0; i < PLAYER.CLIP_SIZE; i++) {
      this._ammoIcons[i].fillColor = i < ammo ? COLOR.GOLD_LIGHT : 0x2a2a2a;
    }
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
