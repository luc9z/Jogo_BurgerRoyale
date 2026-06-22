import Phaser from 'phaser';
import { PLAYER, ARENA, DEPTH, EVT, WEAPONS, SVG_H } from '../constants.js';

const SKIN = 'king-default';

const GUN_STYLE = {
  knife:        { type: 'knife', off: 10 },
  pistol:       { type: 'gun', bodyLen: 10, bodyH: 7,  barrelLen: 17, barrelH: 4.5, col: 0xdddddd, bodyCol: 0x888888, off: 12 },
  revolver:     { type: 'gun', bodyLen:  9, bodyH: 7,  barrelLen: 22, barrelH: 4.5, col: 0xeeaa44, bodyCol: 0x995511, off: 11, cylinder: true },
  shotgun:      { type: 'gun', bodyLen: 11, bodyH: 10, barrelLen: 15, barrelH: 8,   col: 0xcc9966, bodyCol: 0x7a4422, off: 10 },
  machinegun:   { type: 'gun', bodyLen: 13, bodyH: 8,  barrelLen: 30, barrelH: 3.5, col: 0x44dd77, bodyCol: 0x228844, off: 12, magazine: true },
  sniper:       { type: 'gun', bodyLen: 13, bodyH: 6,  barrelLen: 40, barrelH: 2.5, col: 0x66bbff, bodyCol: 0x2266cc, off: 12, scope: true },
  burst:        { type: 'gun', bodyLen: 11, bodyH: 7,  barrelLen: 22, barrelH: 4,   col: 0xffbb44, bodyCol: 0xcc6600, off: 12 },
  laser:        { type: 'gun', bodyLen: 12, bodyH: 5,  barrelLen: 35, barrelH: 2,   col: 0x00ffee, bodyCol: 0x007788, off: 12, scope: true },
  doubleshotgun:{ type: 'gun', bodyLen: 11, bodyH: 12, barrelLen: 14, barrelH: 10,  col: 0xff7744, bodyCol: 0x883322, off: 10 },
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
    this._attackLock    = false;
    this._mouseDown     = false;
    this._gpReloadPrev  = false;

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

    this.bullets       = s.physics.add.group({ allowGravity: false });
    this._gunGfx       = s.add.graphics().setDepth(DEPTH.ENTITY + 1);
    this._aimAssistGfx = s.add.graphics().setDepth(DEPTH.ENTITY + 2);

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

  // Mira e crosshair: analógico direito do controle ou mouse
  _updateAim() {
    const pad  = this.scene.input.gamepad?.getPad(0);
    const rs   = pad?.rightStick;
    const DEAD = 0.15;
    const useGamepad = rs && (Math.abs(rs.x) > DEAD || Math.abs(rs.y) > DEAD);

    if (useGamepad) {
      // Controle: stick direito define direção
      const d = Math.hypot(rs.x, rs.y);
      this.lastDir.set(rs.x / d, rs.y / d);
      if (!this._attackLock) this.sprite.setFlipX(rs.x < 0);
      // Aim assist só aqui — só quando stick sendo usado
      this._applyAimAssist();
      this._crosshair.setPosition(
        this.sprite.x + this.lastDir.x * 150,
        this.sprite.y + this.lastDir.y * 150,
      );
    } else {
      // Mouse: crosshair segue ponteiro
      this._aimAssistGfx.clear();
      const ptr  = this.scene.input.activePointer;
      const mx   = ptr.x, my = ptr.y;
      this._crosshair.setPosition(mx, my);
      const dx = mx - this.sprite.x, dy = my - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        this.lastDir.set(dx / dist, dy / dist);
        if (!this._attackLock) this.sprite.setFlipX(dx < 0);
      }
    }
  }

  _applyAimAssist() {
    const enemies = this.scene.enemies?.enemies ?? [];
    const px = this.sprite.x, py = this.sprite.y;
    const RADIUS = 240;
    const CONE   = Math.PI / 9; // ±20° — só inimigos no foco
    const PULL   = 0.60;        // snap forte quando dentro do cone

    let best = null, bestScore = Infinity;
    for (const e of enemies) {
      if (e.isDead || !e.sprite?.active) continue;
      const dx = e.x - px, dy = e.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS || dist < 5) continue;
      const angle    = Math.atan2(dy, dx);
      const aimAngle = Math.atan2(this.lastDir.y, this.lastDir.x);
      let diff = angle - aimAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > CONE) continue;
      // Prioriza mais próximo e mais alinhado
      const score = dist * 0.5 + Math.abs(diff) * 120;
      if (score < bestScore) { bestScore = score; best = { dx, dy, dist, ex: e.x, ey: e.y }; }
    }

    this._aimAssistGfx.clear();
    if (!best) return;

    // Snap forte para o centro do inimigo
    const tx = best.dx / best.dist, ty = best.dy / best.dist;
    const nx = this.lastDir.x + (tx - this.lastDir.x) * PULL;
    const ny = this.lastDir.y + (ty - this.lastDir.y) * PULL;
    const mag = Math.hypot(nx, ny);
    this.lastDir.set(nx / mag, ny / mag);

    // Triângulo indicador pequeno acima do inimigo travado
    const g = this._aimAssistGfx;
    const ix = best.ex, iy = best.ey - 40;
    g.fillStyle(0xff4400, 0.9);
    g.fillTriangle(ix, iy, ix - 5, iy - 9, ix + 5, iy - 9);
  }

  _drawGun() {
    const g = this._gunGfx;
    g.clear();
    const st = GUN_STYLE[this.weaponKey];
    if (!st) return;

    const px    = this.sprite.x, py = this.sprite.y;
    const angle = Math.atan2(this.lastDir.y, this.lastDir.x);
    const cos   = Math.cos(angle), sin = Math.sin(angle);
    const pcos  = -sin, psin = cos;
    const ox = px + cos * st.off, oy = py + sin * st.off;

    // Desenha retângulo rotacionado: d0=início, len=comprimento, hw=meia-altura
    const box = (d0, len, hw, col) => {
      const ax = ox + cos*d0,       ay = oy + sin*d0;
      const bx = ox + cos*(d0+len), by = oy + sin*(d0+len);
      g.fillStyle(col, 1);
      g.fillTriangle(ax+pcos*hw, ay+psin*hw, bx+pcos*hw, by+psin*hw, bx-pcos*hw, by-psin*hw);
      g.fillTriangle(ax+pcos*hw, ay+psin*hw, bx-pcos*hw, by-psin*hw, ax-pcos*hw, ay-psin*hw);
    };

    if (st.type === 'knife') {
      // Guarda (crossguard)
      box(-3, 5, 5.5, 0x888866);
      // Lâmina - triângulo apontado
      const tipX = ox + cos*32, tipY = oy + sin*32;
      g.fillStyle(0xddddef, 1);
      g.fillTriangle(ox+pcos*3.5, oy+psin*3.5, ox-pcos*3.5, oy-psin*3.5, tipX, tipY);
      // Reflexo na borda
      g.fillStyle(0xffffff, 0.55);
      g.fillTriangle(ox-pcos*0.5, oy-psin*0.5, ox-pcos*3.5, oy-psin*3.5, tipX, tipY);
      if (this._attackLock) {
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(tipX, tipY, 5);
      }
      return;
    }

    // Mão segurando a arma — conecta a arma ao corpo (sem ficar "flutuando")
    g.fillStyle(0x3a2412, 1);
    g.fillCircle(ox, oy, st.bodyH * 0.65 + 2);
    g.fillStyle(0xe7b98a, 1);
    g.fillCircle(ox, oy, st.bodyH * 0.65);

    // Contorno escuro atrás (silhueta) → destaca a arma do fundo
    box(0, st.bodyLen, st.bodyH + 1.6, 0x140b05);
    box(st.bodyLen, st.barrelLen, st.barrelH + 1.6, 0x140b05);

    // Corpo / grip (mais largo, mais escuro)
    box(0, st.bodyLen, st.bodyH, st.bodyCol);
    // Cano (mais fino, mais claro)
    box(st.bodyLen, st.barrelLen, st.barrelH, st.col);
    // Reflexo no lado superior do cano (direção -perp = "cima" rotacionado)
    const hlOff = st.barrelH * 0.6;
    const bsX = ox + cos*st.bodyLen       - pcos*hlOff, bsY = oy + sin*st.bodyLen       - psin*hlOff;
    const beX = ox + cos*(st.bodyLen+st.barrelLen) - pcos*hlOff, beY = oy + sin*(st.bodyLen+st.barrelLen) - psin*hlOff;
    g.lineStyle(1, 0xffffff, 0.22);
    g.lineBetween(bsX, bsY, beX, beY);

    // Cilindro (revólver) — do lado de cima do corpo
    if (st.cylinder) {
      const cd = st.bodyLen * 0.5;
      // cilindro fica no lado -perp (topo do corpo)
      const cx2 = ox + cos*cd - pcos*4, cy2 = oy + sin*cd - psin*4;
      g.fillStyle(0xeebb44, 1);
      g.fillCircle(cx2, cy2, 5.5);
      g.lineStyle(1.5, 0x664400, 1);
      g.strokeCircle(cx2, cy2, 5.5);
      g.fillStyle(0xcc9922, 1);
      g.fillCircle(cx2, cy2, 2.5);
    }

    // Carregador (metralhadora) — perpendicular abaixo do corpo (+perp = "baixo")
    if (st.magazine) {
      const md = st.bodyLen * 0.52;
      const mx2 = ox + cos*md, my2 = oy + sin*md;
      const magW = 8, magH = 10;
      const ph = st.bodyH;
      const v0x = mx2 + pcos*ph,             v0y = my2 + psin*ph;
      const v1x = mx2 + cos*magW + pcos*ph,  v1y = my2 + sin*magW + psin*ph;
      const v2x = mx2 + cos*magW + pcos*(ph+magH), v2y = my2 + sin*magW + psin*(ph+magH);
      const v3x = mx2 + pcos*(ph+magH),      v3y = my2 + psin*(ph+magH);
      g.fillStyle(0x226644, 1);
      g.fillTriangle(v0x, v0y, v1x, v1y, v2x, v2y);
      g.fillTriangle(v0x, v0y, v2x, v2y, v3x, v3y);
    }

    // Luneta (sniper) — acima do cano, lado -perp
    if (st.scope) {
      const sd0 = st.bodyLen + 4;
      const slen = st.barrelLen * 0.52;
      const sOff = st.barrelH + 3.5; // distância do eixo (acima)
      // corpo da luneta como retângulo deslocado
      const ssAx = ox + cos*sd0             - pcos*sOff, ssAy = oy + sin*sd0             - psin*sOff;
      const ssEx = ox + cos*(sd0+slen)       - pcos*sOff, ssEy = oy + sin*(sd0+slen)       - psin*sOff;
      const hw2 = 2.5;
      g.fillStyle(0x334455, 1);
      g.fillTriangle(ssAx-pcos*hw2, ssAy-psin*hw2, ssEx-pcos*hw2, ssEy-psin*hw2, ssEx+pcos*hw2, ssEy+psin*hw2);
      g.fillTriangle(ssAx-pcos*hw2, ssAy-psin*hw2, ssEx+pcos*hw2, ssEy+psin*hw2, ssAx+pcos*hw2, ssAy+psin*hw2);
      // lente no centro da luneta
      const lx = ox + cos*(sd0 + slen*0.65) - pcos*sOff;
      const ly = oy + sin*(sd0 + slen*0.65) - psin*sOff;
      g.fillStyle(0x88ddff, 0.9);
      g.fillCircle(lx, ly, 3.5);
      g.lineStyle(1, 0x336688, 0.8);
      g.strokeCircle(lx, ly, 3.5);
    }

    // Flash de disparo
    if (this._attackLock) {
      const mx2 = ox + cos*(st.bodyLen + st.barrelLen);
      const my2 = oy + sin*(st.bodyLen + st.barrelLen);
      const fc  = this.weaponKey === 'laser' ? 0x00ffee : 0xffee44;
      const fc2 = this.weaponKey === 'laser' ? 0x00cccc : 0xffcc22;
      g.fillStyle(fc, 0.92);
      g.fillCircle(mx2, my2, 6);
      g.fillStyle(0xffffff, 0.75);
      g.fillCircle(mx2, my2, 2.5);
      for (let i = 0; i < 4; i++) {
        const ra = angle + (i * Math.PI / 2) + Math.PI / 4;
        g.lineStyle(1.5, fc2, 0.5);
        g.lineBetween(mx2, my2, mx2 + Math.cos(ra)*10, my2 + Math.sin(ra)*10);
      }
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

    // Analógico esquerdo + D-pad do controle
    const pad = this.scene.input.gamepad?.getPad(0);
    if (pad) {
      const DEAD = 0.15;
      const lx = pad.leftStick.x, ly = pad.leftStick.y;
      if (Math.abs(lx) > DEAD) vx = lx * speed;
      if (Math.abs(ly) > DEAD) vy = ly * speed;
      if (pad.buttons[14]?.pressed) vx = -speed;
      if (pad.buttons[15]?.pressed) vx =  speed;
      if (pad.buttons[12]?.pressed) vy = -speed;
      if (pad.buttons[13]?.pressed) vy =  speed;
    }

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
    const pad    = this.scene.input.gamepad?.getPad(0);
    const gpFire = pad && (pad.buttons[7]?.pressed || pad.buttons[0]?.pressed);
    if (!this._mouseDown && !gpFire) return;
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
    if (this.weaponKey === 'laser') { this._fireLaser(angleRad); return; }

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

  _fireLaser(angleRad) {
    const w   = this.weaponDef;
    const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
    const st  = GUN_STYLE.laser;
    // Origem no cano da arma
    const bx  = this.sprite.x + cos * (st.off + st.bodyLen + st.barrelLen);
    const by  = this.sprite.y + sin * (st.off + st.bodyLen + st.barrelLen);

    // Hitscan — acha o inimigo mais próximo ao longo do raio
    const damage = Math.round(w.damage * this._damageMult);
    let hitDist  = w.range;
    let hitEnemy = null;

    for (const e of (this.scene.enemies?.enemies ?? [])) {
      if (e.isDead) continue;
      const dx = e.x - bx, dy = e.y - by;
      const t  = dx * cos + dy * sin;
      if (t < 0 || t > hitDist) continue;
      const perp = Math.abs(dx * sin - dy * cos);
      if (perp < (e.hitRadius ?? 32)) { hitDist = t; hitEnemy = e; }
    }

    const ex = bx + cos * hitDist;
    const ey = by + sin * hitDist;

    // Desenha o feixe
    const g = this.scene.add.graphics().setDepth(DEPTH.BULLET);
    g.lineStyle(10, 0x00ffee, 0.18);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.strokePath();
    g.lineStyle(4,  0x00ffee, 0.70);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.strokePath();
    g.lineStyle(1.5, 0xffffff, 0.95);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.strokePath();

    // Flash de impacto
    g.fillStyle(0x00ffee, 0.85); g.fillCircle(ex, ey, 10);
    g.fillStyle(0xffffff,  0.9); g.fillCircle(ex, ey, 4);

    this.scene.tweens.add({
      targets: g, alpha: 0, duration: 180, ease: 'Quad.easeIn',
      onComplete: () => g.destroy(),
    });

    if (hitEnemy) {
      hitEnemy.takeDamage(damage, { x: cos, y: sin });
      if (hitEnemy.isDead) this.scene.events.emit(EVT.ENEMY_KILLED, hitEnemy.points);
    }
  }

  // ── RECARGA ───────────────────────────────────────────────
  _handleReloadKey() {
    if (this.weaponDef.isMelee) return;
    const pad    = this.scene.input.gamepad?.getPad(0);
    const gpNow  = !!(pad && (pad.buttons[2]?.pressed || pad.buttons[4]?.pressed));
    const gpJust = gpNow && !this._gpReloadPrev;
    this._gpReloadPrev = gpNow;
    if ((Phaser.Input.Keyboard.JustDown(this.keys.R) || gpJust) &&
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

    // Pisca de invencibilidade (alpha) — não tinge o sprite de vermelho,
    // o que ficava feio sobre os gradientes do SVG.
    this._startHurtBlink();

    if (!this._attackLock) {
      this.sprite.play(`${SKIN}-hurt`, true);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (!this.isDead) {
          if (this.isMoving) this.sprite.play(`${SKIN}-walk`, true);
          else               this.sprite.play(`${SKIN}-idle`, true);
        }
      });
    }

    this.isInvincible = true;
    this.scene.time.delayedCall(PLAYER.IFRAME_MS, () => {
      this.isInvincible = false;
      this._stopHurtBlink();
    });

    if (this.hearts <= 0) this._die();
  }

  // Pisca suave durante i-frames
  _startHurtBlink() {
    this._stopHurtBlink();
    this._blinkTween = this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.35,
      duration: 110,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _stopHurtBlink() {
    if (this._blinkTween) { this._blinkTween.stop(); this._blinkTween = null; }
    if (this.sprite?.active) this.sprite.setAlpha(1);
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

    this._stopHurtBlink();
    this.sprite.setVelocity(0, 0);
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

  // ── ESTADO (para snapshot de fase) ───────────────────────
  serialize() {
    return {
      weaponKey:  this.weaponKey,
      hearts:     this.hearts,
      speedBonus: this._speedBonus,
      damageMult: this._damageMult,
      reloadMult: this._reloadMult,
    };
  }

  applyState(st) {
    if (!st) return;
    if (st.weaponKey && st.weaponKey in WEAPONS) this.changeWeapon(st.weaponKey);
    if (typeof st.hearts === 'number') {
      this.hearts = Phaser.Math.Clamp(st.hearts, 1, PLAYER.MAX_HEARTS);
      this.scene.events.emit('hearts-changed', this.hearts);
    }
    this._speedBonus = st.speedBonus ?? 0;
    this._damageMult = st.damageMult ?? 1.0;
    this._reloadMult = st.reloadMult ?? 1.0;
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
