// ═══════════════════════════════════════════════════════════
//  Enemy — Palhaço inimigo
// ═══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { ENEMY, DEPTH } from '../constants.js';

export default class Enemy {
  constructor(scene, x, y, round = 1) {
    this.scene  = scene;
    this.isDead = false;
    this.isHurt = false;

    this.maxHp = ENEMY.BASE_HP + (round - 1) * ENEMY.HP_PER_ROUND;
    this.hp    = this.maxHp;
    this.speed = Math.min(
      ENEMY.BASE_SPEED + (round - 1) * ENEMY.SPEED_PER_ROUND,
      ENEMY.MAX_SPEED,
    );
    this._create(x, y);
  }

  _create(x, y) {
    const s = this.scene;

    this.shadow = s.add.ellipse(x, y + 28, 30, 9, 0x000000, 0.45)
      .setDepth(DEPTH.SHADOW);

    this.sprite = s.physics.add.sprite(x, y, 'clown')
      .setScale(ENEMY.SCALE)
      .setDepth(DEPTH.ENTITY)
      .setAlpha(0);

    this.sprite.body.setSize(50, 85, true);
    this.sprite.body.setAllowGravity(false);
    this.sprite.play('clown-idle');

    s.tweens.add({ targets: this.sprite, alpha: 1, duration: 280 });

    this.hpBg  = s.add.rectangle(x, y - 36, 32, 4, 0x440000)
      .setDepth(DEPTH.ENEMY_UI);
    this.hpBar = s.add.rectangle(x - 16, y - 36, 32, 4, 0x22cc44)
      .setOrigin(0, 0.5).setDepth(DEPTH.ENEMY_UI + 1);
  }

  update(tx, ty) {
    if (this.isDead || !this.sprite?.active) return;

    // Movimento via velocityFromAngle (Phaser 3 padrão)
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
    this.sprite.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed,
    );

    this.sprite.setFlipX(this.sprite.body.velocity.x < 0);

    if (!this.isHurt) {
      const cur = this.sprite.anims.currentAnim?.key;
      if (cur !== 'clown-walk') this.sprite.play('clown-walk', true);
    }

    const sx = this.sprite.x, sy = this.sprite.y;
    this.shadow.setPosition(sx, sy + this.sprite.displayHeight * 0.42);
    this.hpBg.setPosition(sx, sy - 36);
    this.hpBar.setPosition(sx - 16, sy - 36);
  }

  takeDamage(amount, dir) {
    if (this.isDead) return;
    this.hp -= amount;

    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width     = 32 * pct;
    this.hpBar.fillColor = pct > 0.5 ? 0x22cc44 : pct > 0.25 ? 0xff8800 : 0xff2200;

    if (this.hp <= 0) { this._die(); return; }

    this.isHurt = true;
    this.sprite.setTint(0xff7777);
    this.sprite.play('clown-hurt', true);

    if (dir) {
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.sprite.x + dir.x * 14,
        y: this.sprite.y + dir.y * 14,
        duration: 60, yoyo: true,
      });
    }

    this.scene.time.delayedCall(180, () => {
      if (!this.isDead && this.sprite?.active) {
        this.sprite.clearTint();
        this.isHurt = false;
      }
    });
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this.sprite.setVelocity(0, 0);
    this.sprite.clearTint();
    this.sprite.play('clown-death', true);

    this.hpBg.destroy();
    this.hpBar.destroy();

    this._deathFX();
    this._pointsText();

    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.time.delayedCall(150, () => {
        if (this.shadow?.active) this.shadow.destroy();
        if (this.sprite?.active) this.sprite.destroy();
      });
    });
  }

  _deathFX() {
    const { x, y } = this.sprite;
    const g = this.scene.add.graphics().setDepth(DEPTH.FX);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = Phaser.Math.Between(10, 26);
      g.fillStyle(i % 2 === 0 ? 0xff3300 : 0xffd740, 1);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, 3);
    }
    this.scene.time.delayedCall(220, () => g.destroy());
  }

  _pointsText() {
    const { x, y } = this.sprite;
    const t = this.scene.add.text(x, y - 12, `+${ENEMY.POINTS}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px', color: '#ffd740',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(DEPTH.FX + 1);

    this.scene.tweens.add({
      targets: t, y: y - 50, alpha: 0, duration: 800,
      onComplete: () => t.destroy(),
    });
  }

  get x() { return this.sprite?.x ?? 0; }
  get y() { return this.sprite?.y ?? 0; }
}
