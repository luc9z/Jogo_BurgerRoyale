import Phaser from 'phaser';
import { PLAYER, BULLET, ARENA, DEPTH, EVT } from '../constants.js';

export default class Player {
  constructor(scene) {
    this.scene        = scene;
    this.health       = PLAYER.MAX_HEALTH;
    this.ammo         = PLAYER.CLIP_SIZE;
    this.isReloading  = false;
    this.canShoot     = true;
    this.isInvincible = false;
    this.isDead       = false;
    this.isMoving     = false;   // flag de movimento real
    this.lastDir      = new Phaser.Math.Vector2(1, 0);
    this._attackLock  = false;   // bloqueio de troca de anim durante ataque

    this._create();
    this._buildControls();
  }

  _create() {
    const s  = this.scene;
    const cx = ARENA.X + ARENA.W / 2;
    const cy = ARENA.Y + ARENA.H / 2;

    this.shadow = s.add.ellipse(cx, cy+30, 38, 10, 0x000000, 0.5)
      .setDepth(DEPTH.SHADOW);

    this.sprite = s.physics.add.sprite(cx, cy, 'king')
      .setScale(PLAYER.SCALE)
      .setDepth(DEPTH.ENTITY)
      .setCollideWorldBounds(true);

    // Hitbox menor que o frame para evitar colisão falsa com borda
    this.sprite.body.setSize(48, 80, true);
    this.sprite.body.setAllowGravity(false);

    // ✅ Começa parado com idle
    this.sprite.play('king-idle');

    this.bullets = s.physics.add.group({ allowGravity: false });

    s.events.emit('player-health-changed', this.health);
    s.events.emit('ammo-changed', this.ammo);
  }

  _buildControls() {
    const s = this.scene;
    this.cursors = s.input.keyboard.createCursorKeys();
    this.keys    = s.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      R:     Phaser.Input.Keyboard.KeyCodes.R,
    });
  }

  update(_delta) {
    if (this.isDead) return;
    this._move();
    this._handleShoot();
    this._handleReloadKey();
    this.shadow.setPosition(
      this.sprite.x,
      this.sprite.y + this.sprite.displayHeight * 0.42,
    );
  }

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

    // ✅ Só muda animação se NÃO estiver em ataque ou hurt
    if (!this._attackLock) {
      if (this.isMoving) {
        if (sprite.anims.currentAnim?.key !== 'king-walk') {
          sprite.play('king-walk', true);
        }
      } else {
        // ✅ Parado → idle (corrige o bug de sprite girando sempre)
        if (sprite.anims.currentAnim?.key !== 'king-idle') {
          sprite.play('king-idle', true);
        }
      }
    }
  }

  _handleShoot() {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) return;
    if (!this.canShoot || this.isReloading || this.isDead)  return;
    if (this.ammo <= 0) { this._startReload(); return; }

    this.ammo--;
    this.scene.events.emit('ammo-changed', this.ammo);

    const bx = this.sprite.x + this.lastDir.x * 24;
    const by = this.sprite.y + this.lastDir.y * 6;

    // Bala como quadrado dourado físico
    const bullet = this.scene.physics.add.image(bx, by, 'king', 0)
      .setDepth(DEPTH.BULLET)
      .setTint(0xffe060)
      .setScale(0.065);
    bullet.body.setAllowGravity(false);
    bullet.body.setSize(24, 24);
    bullet.setVelocity(
      this.lastDir.x * BULLET.SPEED,
      this.lastDir.y * BULLET.SPEED,
    );
    this.bullets.add(bullet);

    this.scene.cameras.main.flash(30, 255, 220, 80, false);

    // ✅ Animação de ataque com lock — não interrompe sem terminar
    this._attackLock = true;
    this.sprite.play('king-attack', true);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this._attackLock = false;
      if (!this.isDead) {
        // Volta pra animação correta (idle ou walk)
        if (this.isMoving) this.sprite.play('king-walk', true);
        else this.sprite.play('king-idle', true);
      }
    });

    this.canShoot = false;
    this.scene.time.delayedCall(PLAYER.SHOOT_CD_MS, () => { this.canShoot = true; });
    if (this.ammo <= 0) this._startReload();
  }

  _handleReloadKey() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.R) &&
        !this.isReloading && this.ammo < PLAYER.CLIP_SIZE) {
      this._startReload();
    }
  }

  _startReload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.canShoot    = false;
    this.scene.events.emit('reload-start');
    this.scene.time.delayedCall(PLAYER.RELOAD_MS, () => {
      if (this.isDead) return;
      this.ammo = PLAYER.CLIP_SIZE;
      this.isReloading = false;
      this.canShoot    = true;
      this.scene.events.emit('reload-done');
      this.scene.events.emit('ammo-changed', this.ammo);
    });
  }

  takeDamage(amount) {
    if (this.isInvincible || this.isDead) return;
    this.health = Math.max(0, this.health - amount);
    this.scene.events.emit('player-health-changed', this.health);

    this.scene.cameras.main.flash(60, 160, 0, 0, false);
    this.sprite.setTint(0xff4444);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) this.sprite.clearTint();
    });

    this.isInvincible = true;
    this.scene.time.delayedCall(PLAYER.IFRAME_MS, () => { this.isInvincible = false; });

    if (this.health <= 0) this._die();
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this._attackLock = false;
    this.sprite.setVelocity(0, 0);
    this.sprite.play('king-idle', true);
    this.sprite.setTint(0xff2200);
    this.scene.time.delayedCall(400, () => {
      this.scene.events.emit(EVT.PLAYER_DEAD);
    });
  }

  reloadFull() {
    this.ammo = PLAYER.CLIP_SIZE;
    this.isReloading = false;
    this.canShoot    = true;
    this.scene.events.emit('reload-done');
    this.scene.events.emit('ammo-changed', this.ammo);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
