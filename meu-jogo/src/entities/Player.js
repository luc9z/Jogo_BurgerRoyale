// ═══════════════════════════════════════════════════════════
//  Player — O Rei do Burger
// ═══════════════════════════════════════════════════════════
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
    this.lastDir      = new Phaser.Math.Vector2(1, 0);

    this._create();
    this._buildControls();
  }

  _create() {
    const s  = this.scene;
    const sx = ARENA.X + ARENA.W / 2;
    const sy = ARENA.Y + ARENA.H / 2;

    // Sombra
    this.shadow = s.add.ellipse(sx, sy + 30, 36, 10, 0x000000, 0.5)
      .setDepth(DEPTH.SHADOW);

    // Sprite com física
    this.sprite = s.physics.add.sprite(sx, sy, 'king')
      .setScale(PLAYER.SCALE)
      .setDepth(DEPTH.ENTITY)
      .setCollideWorldBounds(true);

    this.sprite.body.setSize(50, 90, true);
    this.sprite.body.setAllowGravity(false);
    this.sprite.play('king-idle');

    // Grupo de balas
    this.bullets = s.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false,
    });

    // Emite estado inicial pra HUD
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

  // ── UPDATE ───────────────────────────────────────────────
  update(_delta) {
    if (this.isDead) return;
    this._move();
    this._handleShoot();
    this._handleReloadKey();

    // Sombra acompanha
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

    if (vx !== 0 || vy !== 0) {
      this.lastDir.set(vx, vy).normalize();
      sprite.setFlipX(vx < 0);

      const cur = sprite.anims.currentAnim?.key;
      if (cur !== 'king-attack' && cur !== 'king-hurt') {
        sprite.play('king-walk', true);
      }
    } else {
      const cur = sprite.anims.currentAnim?.key;
      if (cur !== 'king-idle' && cur !== 'king-attack' && cur !== 'king-hurt') {
        sprite.play('king-idle', true);
      }
    }
  }

  _handleShoot() {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) return;
    if (!this.canShoot || this.isReloading || this.isDead)  return;

    if (this.ammo <= 0) { this._startReload(); return; }

    this.ammo--;
    this.scene.events.emit('ammo-changed', this.ammo);

    // Cria bala — quadrado dourado simples com física
    const bx = this.sprite.x + this.lastDir.x * 22;
    const by = this.sprite.y + this.lastDir.y * 8;

    // Usa physics.add.image com frame válido + tint
    const bullet = this.scene.physics.add.image(bx, by, 'king', 0)
      .setDepth(DEPTH.BULLET)
      .setTint(0xffd740)
      .setScale(0.06);

    bullet.body.setSize(32, 32);
    bullet.body.setAllowGravity(false);
    bullet.setVelocity(
      this.lastDir.x * BULLET.SPEED,
      this.lastDir.y * BULLET.SPEED,
    );

    this.bullets.add(bullet);

    this.scene.cameras.main.flash(35, 255, 220, 80, false);

    this.sprite.play('king-attack', true);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.isDead) this.sprite.play('king-idle', true);
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
      this.ammo        = PLAYER.CLIP_SIZE;
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
    this.scene.time.delayedCall(PLAYER.IFRAME_MS, () => {
      this.isInvincible = false;
    });

    if (this.health <= 0) this._die();
    else {
      this.sprite.play('king-hurt', true);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (!this.isDead) this.sprite.play('king-idle', true);
      });
    }
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this.sprite.setVelocity(0, 0);
    this.sprite.play('king-hurt', true);
    this.scene.time.delayedCall(400, () => {
      this.scene.events.emit(EVT.PLAYER_DEAD);
    });
  }

  reloadFull() {
    this.ammo        = PLAYER.CLIP_SIZE;
    this.isReloading = false;
    this.canShoot    = true;
    this.scene.events.emit('reload-done');
    this.scene.events.emit('ammo-changed', this.ammo);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
