import Phaser from 'phaser';
import { ENEMY, ENEMY_TYPES, DEPTH, SVG_H } from '../constants.js';

const HP_BAR_W = 40;

export default class Enemy {
  constructor(scene, x, y, round = 1, type = 'clown') {
    this.scene    = scene;
    this.isDead   = false;
    this.isHurt   = false;
    this._cleaned = false;

    const def = ENEMY_TYPES[type] ?? ENEMY_TYPES.clown;
    this.type  = type;
    this.key   = def.key;
    this.scale = def.scale;

    this.maxHp = (ENEMY.BASE_HP + (round - 1) * ENEMY.HP_PER_ROUND) * def.hpMult;
    this.hp    = this.maxHp;
    this.speed = Math.min(
      (ENEMY.BASE_SPEED + (round - 1) * ENEMY.SPEED_PER_ROUND) * def.speedMult,
      ENEMY.MAX_SPEED,
    );
    this.points = Math.round(ENEMY.POINTS * def.pointsMult);

    // Hitbox proporcional ao tamanho. Antes era fixa (32) p/ todos, então
    // chefes (scale 1.65) só recebiam dano no centro/"cabeça". Agora escala
    // com o tamanho — palhaço base (0.6) mantém ~32.
    this.hitRadius = Math.max(28, ENEMY.HIT_RADIUS * (this.scale / 0.6));

    this._driftOffset = Math.random() * Math.PI * 2;
    this._create(x, y);
  }

  _create(x, y) {
    const s = this.scene;
    const k = this.key;

    this._halfH = Math.round((SVG_H * this.scale) / 2);

    this.shadow = s.add.ellipse(x, y + this._halfH - 6, 38, 12, 0x000000, 0.45)
      .setDepth(DEPTH.SHADOW);

    this.sprite = s.physics.add.sprite(x, y, 'clown-frame-idle')
      .setScale(this.scale)
      .setDepth(DEPTH.ENTITY)
      .setAlpha(0);

    this.sprite.body.setSize(60, 75, true);
    this.sprite.body.setAllowGravity(false);

    this.sprite.play(`${k}-idle`);

    s.tweens.add({ targets: this.sprite, alpha: 1, duration: 280 });

    // Barra de HP
    const hpY = y - this._halfH - 10;
    const bgColor = this.type === 'clown-fat'    ? 0x884400
                  : this.type === 'clown-skinny' ? 0x440088
                  : 0x440000;

    this.hpBg  = s.add.rectangle(x, hpY, HP_BAR_W + 4, 7, bgColor, 0.85)
      .setDepth(DEPTH.ENEMY_UI);
    this.hpBar = s.add.rectangle(x - HP_BAR_W / 2, hpY, HP_BAR_W, 5, 0x22cc44)
      .setOrigin(0, 0.5).setDepth(DEPTH.ENEMY_UI + 1);
  }

  update(tx, ty) {
    if (this.isDead || !this.sprite?.active) return;

    const k    = this.key;
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, tx, ty);

    if (dist > 5) {
      const baseAngle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
      // Drift leve para flanquear — cada inimigo tem fase diferente
      const drift = Math.sin(this.scene.time.now * 0.0012 + this._driftOffset) * 0.22;
      const angle = baseAngle + drift;
      this.sprite.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed,
      );
      this.sprite.setFlipX(this.sprite.body.velocity.x < 0);

      if (!this.isHurt && this.sprite.anims.currentAnim?.key !== `${k}-walk`) {
        this.sprite.play(`${k}-walk`, true);
      }
    } else {
      this.sprite.setVelocity(0, 0);
      if (!this.isHurt && this.sprite.anims.currentAnim?.key !== `${k}-idle`) {
        this.sprite.play(`${k}-idle`, true);
      }
    }

    const sx = this.sprite.x, sy = this.sprite.y;
    this.shadow.setPosition(sx, sy + this._halfH - 6);
    const hpY = sy - this._halfH - 10;
    this.hpBg.setPosition(sx, hpY);
    this.hpBar.setPosition(sx - HP_BAR_W / 2, hpY);
  }

  takeDamage(amount, dir) {
    if (this.isDead) return;
    this.hp -= amount;

    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width     = HP_BAR_W * pct;
    this.hpBar.fillColor = pct > 0.5 ? 0x22cc44 : pct > 0.25 ? 0xff8800 : 0xff2200;

    this.scene.sound.play('sfx-clown-hit', { volume: 0.25 });

    if (this.hp <= 0) { this._die(); return; }

    this.isHurt = true;
    this.sprite.setAlpha(0.55);
    this.sprite.play(`${this.key}-hurt`, true);

    if (dir) {
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.sprite.x + dir.x * 18,
        y: this.sprite.y + dir.y * 18,
        duration: 60, yoyo: true,
      });
    }

    this.scene.time.delayedCall(200, () => {
      if (!this.isDead && this.sprite?.active) {
        this.sprite.setAlpha(1);
        this.isHurt = false;
      }
    });
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;

    this.sprite.setVelocity(0, 0);
    this.sprite.play(`${this.key}-death`, true);
    this.scene.sound.play('sfx-clown-laugh', {
      volume: 0.45,
      detune: Phaser.Math.Between(-150, 150),
    });

    this.hpBg.destroy();
    this.hpBar.destroy();

    this._deathFX();
    this._pointsText();
    this._tryDropHeal();

    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this._cleanup());
    this.scene.time.delayedCall(2000, () => this._cleanup());
  }

  _cleanup() {
    if (this._cleaned) return;
    this._cleaned = true;
    if (this.shadow?.active) this.shadow.destroy();
    if (this.sprite?.active) this.sprite.destroy();
  }

  _deathFX() {
    const { x, y } = this.sprite;
    const g = this.scene.add.graphics().setDepth(DEPTH.FX);
    const count = this.type === 'clown-fat' ? 14 : 8;
    const radius = this.type === 'clown-fat' ? 40 : 28;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const d = Phaser.Math.Between(8, radius);
      g.fillStyle(i % 2 === 0 ? 0xff2200 : 0xffd740, 1);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, this.type === 'clown-fat' ? 5 : 3);
    }
    this.scene.time.delayedCall(280, () => g.destroy());
  }

  _tryDropHeal() {
    const chance = this.type === 'clown-boss' ? 1.0
                 : this.type === 'clown-fat'  ? 0.38
                 : 0.07;
    if (Math.random() >= chance) return;
    const dx = this.sprite.x, dy = this.sprite.y;
    this.scene.time.delayedCall(320, () => {
      this.scene.events.emit('drop-heal', dx, dy);
    });
  }

  _pointsText() {
    const { x, y } = this.sprite;
    const t = this.scene.add.text(x, y - 20, `+${this.points}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.type === 'clown-fat' ? '10px' : '10px',
      color: this.type === 'clown-fat' ? '#ff8800' : '#ffd740',
      stroke: '#000', strokeThickness: 4,
    }).setDepth(DEPTH.FX + 1);
    this.scene.tweens.add({
      targets: t, y: y - 60, alpha: 0, duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  get x() { return this.sprite?.x ?? 0; }
  get y() { return this.sprite?.y ?? 0; }
}
