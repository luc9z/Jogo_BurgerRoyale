import Phaser from 'phaser';
import { ENEMY, ENEMY_TYPES, DEPTH, SVG_H } from '../constants.js';
import { FONT } from '../ui/text.js';

const HP_BAR_W      = 40;
const HP_BAR_W_BOSS = 80;

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
    this._tint = def.tint ?? null;

    this._isChief = type === 'clown-boss';
    this._hpBarW  = this._isChief ? HP_BAR_W_BOSS : HP_BAR_W;

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

    if (this._isChief) this._bossInit();
    this._create(x, y);
  }

  _bossInit() {
    this._chargeState  = 'idle';
    this._chargeAt     = 0;
    this._chargeDir    = { x: 0, y: 0 };
    this._nextChargeAt = 0; // inicializado no primeiro frame
    this._phase        = 2; // 2→1→0 conforme HP cai
    this._enraged      = false;
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
    if (this._tint) this.sprite.setTint(this._tint);

    s.tweens.add({ targets: this.sprite, alpha: 1, duration: 280 });

    const hpY     = y - this._halfH - 10;
    const bgColor = this._isChief        ? 0x880000
                  : this.type === 'clown-fat'    ? 0x884400
                  : this.type === 'clown-skinny' ? 0x440088
                  : 0x440000;
    const barColor = this._isChief ? 0xff2200 : 0x22cc44;

    this.hpBg  = s.add.rectangle(x, hpY, this._hpBarW + 4, 7, bgColor, 0.85)
      .setDepth(DEPTH.ENEMY_UI);
    this.hpBar = s.add.rectangle(x - this._hpBarW / 2, hpY, this._hpBarW, 5, barColor)
      .setOrigin(0, 0.5).setDepth(DEPTH.ENEMY_UI + 1);
  }

  update(tx, ty) {
    if (this.isDead || !this.sprite?.active) return;
    if (this._isChief) { this._bossUpdate(tx, ty); return; }

    const k    = this.key;
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, tx, ty);

    if (dist > 5) {
      const baseAngle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
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
    this.hpBar.setPosition(sx - this._hpBarW / 2, hpY);
  }

  _bossUpdate(tx, ty) {
    const now  = this.scene.time.now;
    const k    = this.key;
    const sx   = this.sprite.x, sy = this.sprite.y;
    const dist = Phaser.Math.Distance.Between(sx, sy, tx, ty);

    if (this._nextChargeAt === 0) this._nextChargeAt = now + 4000;

    const moveSpeed = this._enraged ? this.speed * 1.55 : this.speed;

    if (this._chargeState === 'idle') {
      if (dist > 5) {
        const baseAngle = Phaser.Math.Angle.Between(sx, sy, tx, ty);
        const drift = Math.sin(now * 0.0012 + this._driftOffset) * 0.22;
        const angle = baseAngle + drift;
        this.sprite.setVelocity(Math.cos(angle) * moveSpeed, Math.sin(angle) * moveSpeed);
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

      if (now >= this._nextChargeAt && dist > 120) {
        this._chargeState = 'wind-up';
        this._chargeAt    = now;
        this.sprite.setVelocity(0, 0);
        this.sprite.setTint(0xff3300);
        if (!this.isHurt) this.sprite.play(`${k}-hurt`, true);
      }

    } else if (this._chargeState === 'wind-up') {
      this.sprite.setVelocity(0, 0);
      if (now - this._chargeAt > 550) {
        const len = Math.max(1, dist);
        this._chargeDir   = { x: (tx - sx) / len, y: (ty - sy) / len };
        this._chargeState = 'charging';
        this._chargeAt    = now;
        this.sprite.clearTint();
        this.sprite.setTint(0xff8800);
        this.sprite.play(`${k}-walk`, true);
      }

    } else if (this._chargeState === 'charging') {
      const CHARGE_SPD = this.speed * 5.2;
      const CHARGE_DUR = this._enraged ? 480 : 640;
      this.sprite.setVelocity(
        this._chargeDir.x * CHARGE_SPD,
        this._chargeDir.y * CHARGE_SPD,
      );
      if (!this.isHurt) this.sprite.play(`${k}-walk`, true);

      if (now - this._chargeAt > CHARGE_DUR) {
        this._chargeState = 'recover';
        this._chargeAt    = now;
        this.sprite.clearTint();
      }

    } else if (this._chargeState === 'recover') {
      this.sprite.setVelocity(0, 0);
      if (!this.isHurt && this.sprite.anims.currentAnim?.key !== `${k}-idle`) {
        this.sprite.play(`${k}-idle`, true);
      }
      const RECOVER_DUR = this._enraged ? 380 : 680;
      if (now - this._chargeAt > RECOVER_DUR) {
        this._chargeState  = 'idle';
        this._nextChargeAt = now + (this._enraged ? 2400 : 3500);
      }
    }

    this.shadow.setPosition(this.sprite.x, this.sprite.y + this._halfH - 6);
    const hpY = this.sprite.y - this._halfH - 10;
    this.hpBg.setPosition(this.sprite.x, hpY);
    this.hpBar.setPosition(this.sprite.x - this._hpBarW / 2, hpY);
  }

  takeDamage(amount, dir) {
    if (this.isDead) return;
    this.hp -= amount;

    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width     = this._hpBarW * pct;
    // Boss HP bar: always red; outros: verde→laranja→vermelho
    if (!this._isChief) {
      this.hpBar.fillColor = pct > 0.5 ? 0x22cc44 : pct > 0.25 ? 0xff8800 : 0xff2200;
    }

    this._showDamage(amount);
    this.scene.sound.play('sfx-clown-hit', { volume: 0.30 });

    // Boss: transições de fase
    if (this._isChief) {
      const hpPct = this.hp / this.maxHp;
      if (this._phase >= 2 && hpPct < 0.67) {
        this._phase = 1;
        this.scene.events.emit('boss-spawn-minions', this.x, this.y, 3);
      } else if (this._phase >= 1 && hpPct < 0.34) {
        this._phase = 0;
        this.scene.events.emit('boss-spawn-minions', this.x, this.y, 5);
      }

      if (!this._enraged && this.hp <= this.maxHp * 0.50) {
        this._enterRage();
      }
    }

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
        // Restaura tint do boss se estava em wind-up
        if (this._isChief && this._chargeState === 'wind-up') {
          this.sprite.setTint(0xff3300);
        }
      }
    });
  }

  _enterRage() {
    this._enraged      = true;
    this._chargeState  = 'idle';
    this._nextChargeAt = this.scene.time.now + 1200;

    this.scene.cameras.main.shake(280, 0.013);
    this.scene.cameras.main.flash(220, 255, 0, 0, false);

    const t = this.scene.add.text(this.x, this.y - 55, 'FÚRIA!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: `${FONT.VALUE}px`, color: '#ff2200',
      stroke: '#000000', strokeThickness: 5,
    }).setDepth(DEPTH.FX + 2).setOrigin(0.5);
    this.scene.tweens.add({
      targets: t, y: t.y - 55, alpha: 0, duration: 1100,
      onComplete: () => t.destroy(),
    });
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;

    this.sprite.clearTint();
    this.sprite.setVelocity(0, 0);
    this.sprite.play(`${this.key}-death`, true);
    this.scene.sound.play('sfx-clown-laugh', {
      volume: 0.42,
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
    const count  = this._isChief ? 20 : this.type === 'clown-fat' ? 14 : 8;
    const radius = this._isChief ? 60 : this.type === 'clown-fat' ? 40 : 28;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const d = Phaser.Math.Between(8, radius);
      g.fillStyle(i % 2 === 0 ? 0xff2200 : 0xffd740, 1);
      g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, this._isChief ? 7 : this.type === 'clown-fat' ? 5 : 3);
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
      fontSize: `${FONT.BODY}px`,
      color: this.type === 'clown-fat' ? '#ff8800' : '#ffd740',
      stroke: '#000', strokeThickness: 4,
    }).setDepth(DEPTH.FX + 1);
    this.scene.tweens.add({
      targets: t, y: y - 60, alpha: 0, duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  // Número de dano flutuante ao ser atingido
  _showDamage(amount) {
    if (!this.sprite?.active) return;
    const x = this.sprite.x + Phaser.Math.Between(-8, 8);
    const y = this.sprite.y - this._halfH * 0.4;
    const big = amount >= 80;
    const t = this.scene.add.text(x, y, `${Math.round(amount)}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: `${big ? FONT.VALUE : FONT.BODY}px`,
      color: big ? '#ffdd33' : '#ffffff',
      stroke: '#000', strokeThickness: big ? 5 : 3,
    }).setOrigin(0.5).setDepth(DEPTH.FX + 2);
    const dx = Phaser.Math.Between(-14, 14);
    this.scene.tweens.add({
      targets: t, x: x + dx, y: y - 34, alpha: 0,
      scaleX: big ? 1.3 : 1, scaleY: big ? 1.3 : 1,
      duration: 620, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  get x() { return this.sprite?.x ?? 0; }
  get y() { return this.sprite?.y ?? 0; }
}
