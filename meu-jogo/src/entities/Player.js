import Phaser from 'phaser';
import { PLAYER, ARENA, DEPTH, EVT, WEAPONS } from '../constants.js';

const SKIN = 'king-default';

export default class Player {
  constructor(scene) {
    this.scene = scene;

    // ── Sistema de 2 slots ─────────────────────────────────
    this.slots      = ['knife', null]; // slot 0 = faca, slot 1 = arma do box
    this.slotAmmo   = [-1, 0];        // -1 = infinito (faca)
    this.activeSlot = 0;
    this._reloadId  = 0;

    this.weaponKey  = 'knife';
    this.weaponDef  = WEAPONS.knife;
    this.ammo       = -1;

    this.isReloading  = false;
    this.canShoot     = true;
    this.isInvincible = false;
    this.isDead       = false;
    this.isMoving     = false;
    this.hearts       = PLAYER.MAX_HEARTS;
    this.lastDir      = new Phaser.Math.Vector2(1, 0);
    this._attackLock  = false;

    this._create();
    this._buildControls();
  }

  _create() {
    const s  = this.scene;
    const cx = ARENA.X + ARENA.W / 2;
    const cy = ARENA.Y + ARENA.H / 2;

    this._halfH = Math.round((100 * PLAYER.SCALE) / 2);
    this.shadow = s.add.ellipse(cx, cy + this._halfH - 4, 42, 12, 0x000000, 0.5)
      .setDepth(DEPTH.SHADOW);

    this.sprite = s.physics.add.sprite(cx, cy, SKIN)
      .setScale(PLAYER.SCALE)
      .setDepth(DEPTH.ENTITY)
      .setCollideWorldBounds(true);

    this.sprite.body.setSize(60, 75, true);
    this.sprite.body.setAllowGravity(false);
    this.sprite.play(`${SKIN}-idle`);

    this.bullets = s.physics.add.group({ allowGravity: false });

    s.events.emit('hearts-changed', this.hearts);
    s.events.emit('ammo-changed', this.ammo);
    s.events.emit('slots-changed', [...this.slots], this.activeSlot);
  }

  _buildControls() {
    const s = this.scene;
    this.cursors = s.input.keyboard.createCursorKeys();
    this.keys    = s.input.keyboard.addKeys({
      W:     Phaser.Input.Keyboard.KeyCodes.W,
      A:     Phaser.Input.Keyboard.KeyCodes.A,
      S:     Phaser.Input.Keyboard.KeyCodes.S,
      D:     Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      R:     Phaser.Input.Keyboard.KeyCodes.R,
      Q:     Phaser.Input.Keyboard.KeyCodes.Q,
    });
  }

  update(_delta) {
    if (this.isDead) return;
    this._move();
    this._handleSwitch();
    this._handleShoot();
    this._handleReloadKey();
    this.shadow.setPosition(this.sprite.x, this.sprite.y + this._halfH - 4);
  }

  // ── MOVIMENTO ─────────────────────────────────────────────
  _move() {
    const { cursors, keys, sprite } = this;
    let vx = 0, vy = 0;

    if (cursors.left.isDown  || keys.A.isDown) vx = -PLAYER.SPEED;
    if (cursors.right.isDown || keys.D.isDown) vx =  PLAYER.SPEED;
    if (cursors.up.isDown    || keys.W.isDown) vy = -PLAYER.SPEED;
    if (cursors.down.isDown  || keys.S.isDown) vy =  PLAYER.SPEED;

    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

    sprite.setVelocity(vx, vy);
    this.isMoving = (vx !== 0 || vy !== 0);

    if (this.isMoving) {
      this.lastDir.set(vx, vy).normalize();
      sprite.setFlipX(vx < 0);
    }

    if (!this._attackLock) {
      const anim = this.isMoving ? `${SKIN}-walk` : `${SKIN}-idle`;
      if (sprite.anims.currentAnim?.key !== anim) sprite.play(anim, true);
    }
  }

  // ── TROCA DE SLOT (Q) ──────────────────────────────────────
  _handleSwitch() {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.Q)) return;
    const other = 1 - this.activeSlot;
    if (this.slots[other] === null) return; // slot vazio, não troca

    // Salva ammo do slot atual
    this.slotAmmo[this.activeSlot] = this.ammo;
    this._reloadId++; // cancela reload pendente

    // Ativa o outro slot
    this.activeSlot = other;
    this.weaponKey  = this.slots[this.activeSlot];
    this.weaponDef  = WEAPONS[this.weaponKey];
    this.ammo       = this.slotAmmo[this.activeSlot];
    this.isReloading = false;
    this.canShoot    = true;

    this.scene.events.emit('reload-done');
    this.scene.events.emit('ammo-changed', this.ammo);
    this.scene.events.emit(EVT.WEAPON_CHANGED, this.weaponKey);
    this.scene.events.emit('slots-changed', [...this.slots], this.activeSlot);
  }

  // ── DISPARO / ATAQUE ──────────────────────────────────────
  _handleShoot() {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) return;
    if (!this.canShoot || this.isReloading || this.isDead) return;

    if (this.weaponDef.isMelee) {
      this._meleeAttack();
      return;
    }

    if (this.ammo <= 0) { this._startReload(); return; }

    this.ammo--;
    this.scene.events.emit('ammo-changed', this.ammo);
    this.scene.sound.play('sfx-shoot', { volume: 0.35 });

    const baseAngle = Math.atan2(this.lastDir.y, this.lastDir.x);
    const w = this.weaponDef;
    for (let i = 0; i < w.pellets; i++) {
      this._fireBullet(baseAngle + (Math.random() - 0.5) * w.spread);
    }

    this.scene.cameras.main.flash(30, 255, 220, 80, false);

    this._attackLock = true;
    this.sprite.play(`${SKIN}-attack`, true);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this._attackLock = false;
      if (!this.isDead) {
        if (this.isMoving) this.sprite.play(`${SKIN}-walk`, true);
        else               this.sprite.play(`${SKIN}-idle`, true);
      }
    });

    this.canShoot = false;
    this.scene.time.delayedCall(w.shootCd, () => { this.canShoot = true; });
    if (this.ammo <= 0) this._startReload();
  }

  // ── ATAQUE CORPO A CORPO ──────────────────────────────────
  _meleeAttack() {
    this.canShoot    = false;
    this._attackLock = true;

    this.sprite.play(`${SKIN}-attack`, true);
    this.scene.sound.play('sfx-shoot', { volume: 0.4, detune: -600 });

    // Verifica todos os inimigos dentro do range
    const range   = this.weaponDef.range;
    const enemies = this.scene.enemies?.enemies ?? [];
    let hitAny    = false;

    for (const e of enemies) {
      if (e.isDead) continue;
      const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.x, e.y);
      if (d < range) {
        const dx  = e.x - this.sprite.x, dy = e.y - this.sprite.y;
        const len = Math.hypot(dx, dy) || 1;
        e.takeDamage(this.weaponDef.damage, { x: dx / len, y: dy / len });
        if (e.isDead) this.scene.events.emit(EVT.ENEMY_KILLED, e.points);
        hitAny = true;
      }
    }

    if (hitAny) this.scene.cameras.main.flash(25, 255, 180, 0, false);

    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this._attackLock = false;
      if (!this.isDead) {
        if (this.isMoving) this.sprite.play(`${SKIN}-walk`, true);
        else               this.sprite.play(`${SKIN}-idle`, true);
      }
    });

    this.scene.time.delayedCall(this.weaponDef.shootCd, () => { this.canShoot = true; });
  }

  // ── BALA ──────────────────────────────────────────────────
  _fireBullet(angleRad) {
    const w  = this.weaponDef;
    const bx = this.sprite.x + Math.cos(angleRad) * 30;
    const by = this.sprite.y + Math.sin(angleRad) * 30;

    const bullet = this.scene.physics.add.image(bx, by, 'bullet').setDepth(DEPTH.BULLET);
    bullet.body.setAllowGravity(false);
    bullet.body.setSize(10, 10, true);
    this.bullets.add(bullet);
    bullet.body.setVelocity(Math.cos(angleRad) * w.bulletSpeed, Math.sin(angleRad) * w.bulletSpeed);

    bullet._ox     = bx;
    bullet._oy     = by;
    bullet._range  = w.range;
    bullet._damage = w.damage;
  }

  // ── RECARGA ───────────────────────────────────────────────
  _handleReloadKey() {
    if (this.weaponDef.isMelee) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.R) &&
        !this.isReloading && this.ammo < this.weaponDef.clipSize) {
      this._startReload();
    }
  }

  _startReload() {
    if (this.weaponDef.isMelee || this.isReloading) return;
    this.isReloading = true;
    this.canShoot    = false;
    this.scene.events.emit('reload-start');
    this.scene.sound.play('sfx-reload', { volume: 0.55 });

    const id = ++this._reloadId;
    this.scene.time.delayedCall(this.weaponDef.reloadMs, () => {
      if (this.isDead || this._reloadId !== id) return; // cancelado por troca de slot
      this.ammo = this.weaponDef.clipSize;
      this.isReloading = false;
      this.canShoot    = true;
      this.scene.events.emit('reload-done');
      this.scene.events.emit('ammo-changed', this.ammo);
    });
  }

  // ── EQUIPAR ARMA (mystery box) ────────────────────────────
  equipWeapon(key) {
    if (!(key in WEAPONS) || WEAPONS[key].isMelee) return;

    // Salva ammo do slot atual e cancela reload
    this.slotAmmo[this.activeSlot] = this.ammo;
    this._reloadId++;

    // Arma do box sempre vai pro slot 1
    this.slots[1]    = key;
    this.slotAmmo[1] = WEAPONS[key].clipSize;

    // Auto-troca pro slot 1
    this.activeSlot  = 1;
    this.weaponKey   = key;
    this.weaponDef   = WEAPONS[key];
    this.ammo        = this.slotAmmo[1];
    this.isReloading = false;
    this.canShoot    = true;

    this.scene.events.emit('reload-done');
    this.scene.events.emit('ammo-changed', this.ammo);
    this.scene.events.emit(EVT.WEAPON_CHANGED, key);
    this.scene.events.emit('slots-changed', [...this.slots], this.activeSlot);
  }

  // ── DANO ──────────────────────────────────────────────────
  takeDamage(hearts = 1) {
    if (this.isInvincible || this.isDead) return;

    this.hearts = Math.max(0, this.hearts - hearts);
    this.scene.events.emit('hearts-changed', this.hearts);

    this.scene.cameras.main.flash(90, 200, 0, 0, false);
    this.scene.cameras.main.shake(200, 0.009);
    this.scene.sound.play('sfx-player-hurt', { volume: 0.65 });

    if (!this._attackLock) {
      this.sprite.setTint(0xff2222);
      this.sprite.play(`${SKIN}-hurt`, true);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (!this.isDead) {
          this.sprite.clearTint();
          if (this.isMoving) this.sprite.play(`${SKIN}-walk`, true);
          else               this.sprite.play(`${SKIN}-idle`, true);
        }
      });
    } else {
      this.sprite.setTint(0xff2222);
      this.scene.time.delayedCall(150, () => {
        if (!this.isDead) this.sprite.clearTint();
      });
    }

    this.isInvincible = true;
    this.scene.time.delayedCall(PLAYER.IFRAME_MS, () => { this.isInvincible = false; });

    if (this.hearts <= 0) this._die();
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this._attackLock = false;
    this.sprite.setVelocity(0, 0);
    this.sprite.clearTint();
    this.sprite.play(`${SKIN}-death`, true);
    this.scene.sound.play('sfx-player-death', { volume: 0.7 });
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.time.delayedCall(300, () => this.scene.events.emit(EVT.PLAYER_DEAD));
    });
    this.scene.time.delayedCall(1200, () => this.scene.events.emit(EVT.PLAYER_DEAD));
  }

  reloadFull() {
    if (!this.weaponDef.isMelee) {
      this.ammo = this.weaponDef.clipSize;
      this.scene.events.emit('ammo-changed', this.ammo);
    }
    this.isReloading = false;
    this.canShoot    = true;
    this.scene.events.emit('reload-done');
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
