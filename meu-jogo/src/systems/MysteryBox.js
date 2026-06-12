import Phaser from 'phaser';
import { ARENA, DEPTH, MYSTERY_BOX, WEAPONS } from '../constants.js';

const WEAPON_KEYS = Object.keys(WEAPONS).filter(k => !WEAPONS[k].isMelee && k !== 'pistol');

const WEAPON_COLOR = {
  revolver:   0xcc6600,
  shotgun:    0xff6600,
  machinegun: 0x44ffaa,
  sniper:     0x00aaff,
};

export default class MysteryBox {
  constructor(scene) {
    this.scene    = scene;
    this.isOpen   = false;
    this._key     = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this._build();
  }

  _build() {
    const s  = this.scene;
    // Posição: canto inferior direito da arena
    this.x = ARENA.X + ARENA.W * 0.78;
    this.y = ARENA.Y + ARENA.H * 0.78;
    const { x, y } = this;

    this._glow = s.add.circle(x, y, 34, 0xffd740, 0.15).setDepth(DEPTH.ENTITY - 1);

    this._box = s.add.rectangle(x, y, 44, 44, 0x1a0030)
      .setStrokeStyle(3, 0xffd740)
      .setDepth(DEPTH.ENTITY);

    this._qmark = s.add.text(x, y, '?', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '22px', color: '#ffd740',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.ENTITY + 1);

    this._costLbl = s.add.text(x, y - 30, `${MYSTERY_BOX.COST} pts`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px', color: '#ffd740',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(DEPTH.ENTITY + 1);

    this._eLbl = s.add.text(x, y - 38, 'PRESSIONE [E]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(DEPTH.ENTITY + 1).setAlpha(0);

    s.tweens.add({
      targets: this._glow,
      scaleX: 1.4, scaleY: 1.4, alpha: 0.28,
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // Retorna a chave da arma sorteada, ou null se não puder abrir
  update(playerX, playerY, score) {
    const dist = Phaser.Math.Distance.Between(playerX, playerY, this.x, this.y);
    const near     = dist < MYSTERY_BOX.INTERACT_DIST;
    const canAfford = score >= MYSTERY_BOX.COST;

    this._eLbl.setAlpha(near && canAfford ? 1 : 0);

    if (near && canAfford && Phaser.Input.Keyboard.JustDown(this._key)) {
      return this._open();
    }
    return null;
  }

  _open() {
    const weapon = Phaser.Utils.Array.GetRandom(WEAPON_KEYS);
    this._flash(WEAPON_COLOR[weapon] ?? 0xffd740);
    this._showWeaponBanner(weapon);
    return weapon;
  }

  _flash(color) {
    const s = this.scene;
    let tog = false;
    const iv = setInterval(() => {
      this._box.setStrokeStyle(3, tog ? color : 0xffd740);
      tog = !tog;
    }, 80);
    s.time.delayedCall(600, () => {
      clearInterval(iv);
      if (this._box?.active) this._box.setStrokeStyle(3, 0xffd740);
    });
  }

  _showWeaponBanner(weaponKey) {
    const s = this.scene;
    const { WIDTH: W, HEIGHT: H } = { WIDTH: 960, HEIGHT: 540 };
    const name = WEAPONS[weaponKey]?.name ?? weaponKey;

    const lbl = s.add.text(W / 2, H / 2 - 60, `ARMA: ${name}!`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px', color: '#ffd740',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(DEPTH.BANNER).setAlpha(0);

    s.tweens.add({
      targets: lbl, alpha: 1, y: H / 2 - 80, duration: 300,
      onComplete: () => {
        s.time.delayedCall(1200, () => {
          s.tweens.add({ targets: lbl, alpha: 0, duration: 300, onComplete: () => lbl.destroy() });
        });
      },
    });
  }
}
