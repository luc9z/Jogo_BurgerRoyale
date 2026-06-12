import Phaser from 'phaser';
import { PLAYER, ARENA, DEPTH, EVT, WEAPONS, SVG_H } from '../constants.js';

const SKIN = 'king-default';

// Estilo visual de cada arma (desenhado como retângulo rotacionado)
const GUN_STYLE = {
  pistol:     { len: 16, hw: 2.5, col: 0x999999, off: 14 },
  revolver:   { len: 21, hw: 3.0, col: 0xaa8833, off: 13 },
  shotgun:    { len: 17, hw: 5.0, col: 0x885522, off: 11 },
  machinegun: { len: 27, hw: 2.5, col: 0x44aa55, off: 13 },
  sniper:     { len: 35, hw: 1.8, col: 0x4488cc, off: 13 },
};

export default class Player {
  constructor(scene) {
    this.scene = scene;

    this.weaponKey  = 'pistol';
    this.weaponDef  = WEAPONS.pistol;
    this.ammo       = WEAPONS.pistol.clipSize;
    this._reloadId  = 0;
    this._speedBonus  = 0;
    this._damageMult  = 1.0;
    this._reloadMult  = 1.0;

    this.isReloading  = false;
    this.canShoot     = true;
    this.isInvincible = false;
    this.isDead       = false;
    this.isMoving     = false;
    this.hearts       = PLAYER.MAX_HEARTS;
    this.lastDir      = new Phaser.Math.Vector2(1, 0);
    this._attackLock  = false;
    this._mouseDown   = false;

    this._create();
    this._buildControls();
  }

  _create() {
    const s  = this.scene;
    const cx = ARENA.X + ARENA.W / 2;
    const cy = ARENA.Y + ARENA.H / 2;

    this._halfH = Math.round((SVG_H * PLAYER.SCALE) / 2);
    this.shadow = s.add.ellipse(cx, cy + this._halfH - 4, 42, 12, 0x000000, 0.5)
      .setDepth(DEPTH.SHADOW);

    this.sprite = s.physics.add.sprite(cx, cy, 'king-frame-idle')
      .setScale(PLAYER.SCALE)
      .setDepth(DEPTH.ENTITY)
      .setCollideWorldBounds(true);

    this.sprite.body.setSize(60, 75, true);
    this.sprite.body.setAllowGravity(false);
    this.sprite.play(`${SKIN}-idle`);

    this.bullets  = s.physics.add.group({ allowGravity: false });
    this._gunGfx  = s.add.graphics().setDepth(DEPTH.ENTITY + 1);

    s.events.emit('hearts-changed', this.hearts);
    s.events.emit('ammo-changed',   this.ammo);
    s.events.emit(EVT.WEAPON_CHANGED, this.weaponKey);
  }

  _buildControls() {
    const s = this.scene;
    this.cursors = s.input.keyboard.createCursorKeys();
    this.keys    = s.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      R: Phaser.Input.Keyboard.KeyCodes.R,
    });

    // Cursor oculto + crosshair customizado
    s.input.setDefaultCursor('none');

    const g = s.add.graphics().setDepth(DEPTH.HUD + 10);
    g.lineStyle(2, 0xffffff, 0.92);
    g.strokeCircle(0, 0, 13);
    g.lineBetween(-22, 0, -15, 0);
    g.lineBetween(15, 0, 22, 0);
    g.lineBetween(0, -22, 0, -15);
    g.lineBetween(0, 15, 0, 22);
    g.lineStyle(1.5, 0xff3300, 0.95);
    g.strokeCircle(0, 0, 2.5);
    this._crosshair = g;

    // window.addEventListener detecta mouse mesmo fora do canvas
    const onDown = e => { if (e.button === 0) this._mouseDown = true; };
    const onUp   = e => { if (e.button === 0) this._mouseDown = false; };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);
    s.events.once('shutdown', () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      this._mouseDown = false;
    });
  }

  update(_delta) {
    if (this.isDead) return;
    this._updateAim();
    this._move();
    this._handleShoot();
    this._handleReloadKey();
    this.shadow.setPosition(this.sprite.x, this.sprite.y + this._halfH - 4);
    this._drawGun();
  }

  // Mira e crosshair seguem o mouse (ptr.x = coord do jogo)
  _updateAim() {
    const ptr = this.scene.input.activePointer;
    const mx  = ptr.x;
    const my  = ptr.y;
    this._crosshair.setPosition(mx, my);
    const dx   = mx - this.sprite.x;
    const dy   = my - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 10) {
      this.lastDir.set(dx / dist, dy / dist);
      if (!this._attackLock) this.sprite.setFlipX(dx < 0);
    }
  }

  // Desenha a arma como retângulo rotacionado na direção da mira
  _drawGun() {
    const g = this._gunGfx;
    g.clear();
    const st = GUN_STYLE[this.weaponKey];
    if (!st) return;

    const px    = this.sprite.x, py = this.sprite.y;
    const angle = Math.atan2(this.lastDir.y, this.lastDir.x);
    const cos   = Math.cos(angle), sin = Math.sin(angle);
    const pcos  = -sin, psin = cos; // perpendicular

    const ox = px + cos * st.off, oy = py + sin * st.off;

    const x1 = ox + pcos * st.hw,              y1 = oy + psin * st.hw;
    const x2 = ox + cos * st.len + pcos * st.hw, y2 = oy + sin * st.len + psin * st.hw;
    const x3 = ox + cos * st.len - pcos * st.hw, y3 = oy + sin * st.len - psin * st.hw;
    const x4 = ox - pcos * st.hw,              y4 = oy - psin * st.hw;

    g.fillStyle(st.col, 1);
    g.fillTriangle(x1, y1, x2, y2, x3, y3);
    g.fillTriangle(x1, y1, x3, y3, x4, y4);

    // Brilho no cano ao atirar
    if (this._attackLock) {
      g.fillStyle(0xffee55, 0.75);
      g.fillCircle(ox + cos * st.len, oy + sin * st.len, 4);
    }
  }

  // ── MOVIMENTO ─────────────────────────────────────────────
  _move() {
    const { cursors, keys, sprite } = this;
    let vx = 0, vy = 0;
    const speed = PLAYER.SPEED + this._speedBonus;

    if (cursors.left.isDown  || keys.A.isDown) vx = -speed;
    if (cursors.right.isDown || keys.D.isDown) vx =  speed;
    if (cursors.up.isDown    || keys.W.isDown) vy = -speed;
    if (cursors.down.isDown  || keys.S.isDown) vy =  speed;

    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

    sprite.setVelocity(vx, vy);
    this.isMoving = (vx !== 0 || vy !== 0);

    if (!this._attackLock) {
      const anim = this.isMoving ? `${SKIN}-walk` : `${SKIN}-idle`;
      if (sprite.anims.currentAnim?.key !== anim) sprite.play(anim, true);
    }
  }

  // ── DISPARO ──────────────────────────────────────────────
  _handleShoot() {
    if (!this._mouseDown) return;
    if (!this.canShoot || this.isReloading || this.isDead) return;

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
    bullet._damage = Math.round(w.damage * this._damageMult);
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
    const reloadMs = Math.round(this.weaponDef.reloadMs * this._reloadMult);
    this.scene.time.delayedCall(reloadMs, () => {
      if (this.isDead || this._reloadId !== id) return;
      this.ammo        = this.weaponDef.clipSize;
      this.isReloading = false;
      this.canShoot    = true;
      this.scene.events.emit('reload-done');
      this.scene.events.emit('ammo-changed', this.ammo);
    });
  }

  // ── TROCA DE ARMA (por upgrade) ───────────────────────────
  changeWeapon(key) {
    if (!(key in WEAPONS)) return;
    this._reloadId++;
    this.weaponKey   = key;
    this.weaponDef   = WEAPONS[key];
    this.ammo        = WEAPONS[key].isMelee ? -1 : WEAPONS[key].clipSize;
    this.isReloading = false;
    this.canShoot    = true;
    this.scene.events.emit('reload-done');
    this.scene.events.emit('ammo-changed', this.ammo);
    this.scene.events.emit(EVT.WEAPON_CHANGED, key);
  }

  // Compatibilidade com código legado (mystery box removida mas por segurança)
  equipWeapon(key) { this.changeWeapon(key); }

  // ── CURA ──────────────────────────────────────────────────
  heal() {
    if (this.isDead || this.hearts >= PLAYER.MAX_HEARTS) return;
    this.hearts = Math.min(PLAYER.MAX_HEARTS, this.hearts + 1);
    this.scene.events.emit('hearts-changed', this.hearts);
    this.scene.cameras.main.flash(90, 0, 200, 0, false);
  }

  // ── BÔNUS DE UPGRADES ────────────────────────────────────
  addSpeedBonus(amount)  { this._speedBonus = Math.min(this._speedBonus + amount, 120); }
  addDamageBonus(pct)    { this._damageMult = Math.min(this._damageMult + pct, 3.0); }
  addReloadBonus(pct)    { this._reloadMult = Math.max(this._reloadMult - pct, 0.30); }

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
    this._mouseDown  = false;

    // Restaura cursor para o game over
    this.scene.input.setDefaultCursor('default');
    this._crosshair.setVisible(false);
    this._gunGfx.clear();

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
