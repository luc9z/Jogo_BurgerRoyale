import Phaser from 'phaser';
import { PLAYER, ARENA, DEPTH, EVT, WEAPONS, SVG_H } from '../constants.js';
import { footstep } from '../systems/Sfx.js';

const SKIN = 'king-default';

// Assets de arma (SVG). Todas com empunhadura no ponto (14,18) do viewBox
// (altura 32) → origem do sprite. `tip` = distância em px do grip à boca do
// cano (p/ flash e origem do laser). `melee` desativa flash.
const GUN_SCALE = 0.4;   // SVG carregado em 2× → 0.4 = ~0.8 do tamanho nativo
const HAND_OFF  = 18;    // grip à frente do centro do rei — fora do tronco
const HAND_DROP = 12;    // desce p/ altura da mão (não no peito)
const WEAPON_ART = {
  pistol:       { w: 50, tip: 27 },
  revolver:     { w: 54, tip: 30 },
  shotgun:      { w: 62, tip: 38 },
  burst:        { w: 58, tip: 34 },
  machinegun:   { w: 70, tip: 42 },
  sniper:       { w: 80, tip: 51 },
  doubleshotgun:{ w: 60, tip: 36 },
  laser:        { w: 74, tip: 43 },
};

// Tiro sintetizado por arma (WebAudio). crack = ruído filtrado, body = thump
// grave. gain/dur/cut/body variam p/ dar identidade sonora a cada arma.
// Usa o shoot.mp3 (nítido) com pitch (rate) e volume por arma.
// rate < 1 = mais grave/pesado, rate > 1 = mais agudo/rápido.
const SHOT = {
  pistol:        { rate: 1.00, vol: 0.55 },
  revolver:      { rate: 0.82, vol: 0.65 }, // mais grave, encorpado
  shotgun:       { rate: 0.68, vol: 0.70 }, // boom grave
  burst:         { rate: 1.28, vol: 0.42 }, // agudo, rápido
  machinegun:    { rate: 1.15, vol: 0.34 }, // seco (dispara em spam)
  sniper:        { rate: 0.60, vol: 0.75 }, // estouro grave pesado
  doubleshotgun: { rate: 0.64, vol: 0.72 }, // o mais grave
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
    // Dash / esquiva — 2 cargas, recarrega a cada 2 kills (sem cooldown por tempo)
    this._isDashing     = false;
    this._dashUntil     = 0;
    this._dashGapUntil  = 0;
    this._dashDir       = new Phaser.Math.Vector2(1, 0);
    this._gpDashPrev    = false;
    this._iframeUntil   = 0;
    this._dashCharges   = PLAYER.DASH_MAX;
    this._killsToward   = 0;

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
    this._gunImg       = s.add.image(cx, cy, 'wpn-pistol').setDepth(DEPTH.ENTITY + 1);
    this._gunGfx       = s.add.graphics().setDepth(DEPTH.ENTITY + 2); // só muzzle flash
    this._aimAssistGfx = s.add.graphics().setDepth(DEPTH.ENTITY + 2);
    this._applyGunTexture(this.weaponKey);

    s.events.emit('hearts-changed', this.hearts);
    s.events.emit('ammo-changed',   this.ammo);
    s.events.emit(EVT.WEAPON_CHANGED, this.weaponKey);
    s.events.emit('dash-changed', this._dashCharges, PLAYER.DASH_MAX);
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
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
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
    // Invencibilidade controlada por janela única (dano OU dash)
    this.isInvincible = this.scene.time.now < (this._iframeUntil || 0);
    this._updateAim();
    this._handleDash();
    this._move();
    this._handleShoot();
    this._handleReloadKey();
    this.shadow.setPosition(this.sprite.x, this.sprite.y + this._halfH - 4);
    this._drawGun();
  }

  // ── DASH / ESQUIVA ────────────────────────────────────────
  _handleDash() {
    const now = this.scene.time.now;

    // Fim do dash (isInvincible é resolvido pela janela _iframeUntil no update)
    if (this._isDashing && now >= this._dashUntil) this._isDashing = false;

    // Detecta input (borda de subida): Espaço ou botão B do controle
    const pad     = this.scene.input.gamepad?.getPad(0);
    const gpDash  = !!(pad?.buttons[1]?.pressed); // B
    const kbDash  = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    const pressed = kbDash || (gpDash && !this._gpDashPrev);
    this._gpDashPrev = gpDash;

    if (!pressed || this._isDashing || this._dashCharges <= 0 || now < this._dashGapUntil) return;

    // Direção: movimento atual, senão a direção de mira
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown  || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown    || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown  || this.keys.S.isDown) dy += 1;
    if (pad) {
      const ls = pad.leftStick;
      if (ls && (Math.abs(ls.x) > 0.3 || Math.abs(ls.y) > 0.3)) { dx = ls.x; dy = ls.y; }
    }
    if (dx === 0 && dy === 0) { dx = this.lastDir.x; dy = this.lastDir.y; }
    const mag = Math.hypot(dx, dy) || 1;
    this._dashDir.set(dx / mag, dy / mag);

    this._isDashing    = true;
    this._dashUntil    = now + PLAYER.DASH_MS;
    this._dashGapUntil = now + PLAYER.DASH_GAP_MS;
    this._dashCharges  = Math.max(0, this._dashCharges - 1);
    this.scene.events.emit('dash-changed', this._dashCharges, PLAYER.DASH_MAX);
    // Nunca encurta uma janela de i-frame já ativa (ex.: levou dano antes)
    this._iframeUntil  = Math.max(this._iframeUntil || 0, now + PLAYER.DASH_IFRAME_MS);
    this.isInvincible  = true;

    this._dashWhoosh();
    this._spawnAfterimages();
  }

  // Progresso de recarga do dash: a cada KILLS_PER_DASH kills → +1 carga
  addKillProgress() {
    if (this._dashCharges >= PLAYER.DASH_MAX) { this._killsToward = 0; return; }
    this._killsToward++;
    if (this._killsToward >= PLAYER.KILLS_PER_DASH) {
      this._killsToward = 0;
      this._dashCharges = Math.min(PLAYER.DASH_MAX, this._dashCharges + 1);
      this.scene.events.emit('dash-changed', this._dashCharges, PLAYER.DASH_MAX);
    }
  }

  // Rastro de "fantasmas" do rei durante o dash
  _spawnAfterimages() {
    const tex = this.sprite.texture.key;
    const frame = this.sprite.frame.name;
    for (let i = 0; i < 4; i++) {
      this.scene.time.delayedCall(i * 32, () => {
        if (this.isDead) return;
        const ghost = this.scene.add.image(this.sprite.x, this.sprite.y, tex, frame)
          .setScale(this.sprite.scaleX, this.sprite.scaleY)
          .setFlipX(this.sprite.flipX)
          .setDepth(DEPTH.ENTITY - 1)
          .setTint(0x66ccff).setAlpha(0.5);
        this.scene.tweens.add({
          targets: ghost, alpha: 0, duration: 220,
          onComplete: () => ghost.destroy(),
        });
      });
    }
  }

  // Som de dash sintetizado (whoosh — ruído filtrado descendente)
  _dashWhoosh() {
    const mgr = this.scene.sound;
    const ctx = mgr?.context;
    if (!ctx || ctx.state === 'closed' || mgr.mute) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = (mgr.volume ?? 1) * 0.5;
    master.connect(ctx.destination);
    if (!this._noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.3);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
    }
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800, now);
    bp.frequency.exponentialRampToValueAtTime(400, now + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.3, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(now); src.stop(now + 0.22);
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

  // Aplica a textura SVG da arma + origem no ponto de empunhadura (14,18)
  _applyGunTexture(key) {
    const art = WEAPON_ART[key];
    if (!this._gunImg || !art) return;
    const tex = `wpn-${key}`;
    if (!this.scene.textures.exists(tex)) { this._gunImg.setVisible(false); return; }
    this._gunImg.setVisible(true);
    this._gunImg.setTexture(tex);
    this._gunImg.setOrigin(14 / art.w, 18 / 32);
    this._gunImg.setScale(GUN_SCALE);
  }

  _drawGun() {
    const g = this._gunGfx;
    g.clear();
    const art = WEAPON_ART[this.weaponKey];
    if (!art || !this._gunImg) return;

    const px    = this.sprite.x, py = this.sprite.y;
    const angle = Math.atan2(this.lastDir.y, this.lastDir.x);
    const cos   = Math.cos(angle), sin = Math.sin(angle);
    const facingLeft = cos < 0;

    // Grip na mão do rei: à frente do corpo (fora do tronco) e na altura
    // da mão (HAND_DROP desce), não colado no peito.
    const gx = px + cos * HAND_OFF;
    const gy = py + sin * HAND_OFF + HAND_DROP;
    this._gunImg.setVisible(true);
    this._gunImg.setPosition(gx, gy);
    this._gunImg.setRotation(angle);
    // Espelha na vertical ao mirar p/ esquerda — mantém a arma "em pé"
    this._gunImg.setFlipY(facingLeft);

    // Flash na boca do cano (não em arma branca)
    if (this._attackLock && !art.melee && art.tip > 0) {
      const mx = gx + cos * art.tip;
      const my = gy + sin * art.tip;
      const fc  = this.weaponKey === 'laser' ? 0x00ffee : 0xffee44;
      const fc2 = this.weaponKey === 'laser' ? 0x00cccc : 0xffcc22;
      g.fillStyle(fc, 0.92);
      g.fillCircle(mx, my, 6);
      g.fillStyle(0xffffff, 0.75);
      g.fillCircle(mx, my, 2.5);
      for (let i = 0; i < 4; i++) {
        const ra = angle + (i * Math.PI / 2) + Math.PI / 4;
        g.lineStyle(1.5, fc2, 0.5);
        g.lineBetween(mx, my, mx + Math.cos(ra)*10, my + Math.sin(ra)*10);
      }
    }
  }

  // ── MOVIMENTO ─────────────────────────────────────────────
  _move() {
    const { cursors, keys, sprite } = this;

    // Durante o dash a velocidade é fixa na direção do dash
    if (this._isDashing) {
      sprite.setVelocity(this._dashDir.x * PLAYER.DASH_SPEED, this._dashDir.y * PLAYER.DASH_SPEED);
      this.isMoving = true;
      if (!this._attackLock && sprite.anims.currentAnim?.key !== `${SKIN}-walk`) {
        sprite.play(`${SKIN}-walk`, true);
      }
      return;
    }

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

    // Passos: toca em intervalo enquanto anda
    if (this.isMoving) {
      const now = this.scene.time.now;
      if (now >= (this._nextStep || 0)) {
        footstep(this.scene);
        this._nextStep = now + 300;
      }
    }

    if (!this._attackLock) {
      const anim = this.isMoving ? `${SKIN}-walk` : `${SKIN}-idle`;
      if (sprite.anims.currentAnim?.key !== anim) sprite.play(anim, true);
    }
  }

  // ── DISPARO ──────────────────────────────────────────────
  _handleShoot() {
    // Round terminou (transição p/ upgrade) → trava o tiro
    if (this.scene._roundEnding) return;
    const pad    = this.scene.input.gamepad?.getPad(0);
    const gpFire = pad && (pad.buttons[7]?.pressed || pad.buttons[0]?.pressed);
    if (!this._mouseDown && !gpFire) return;
    if (!this.canShoot || this.isReloading || this.isDead) return;

    if (this.ammo <= 0) { this._startReload(); return; }

    this.ammo--;
    this.scene.events.emit('ammo-changed', this.ammo);
    this._playShot();

    const baseAngle = Math.atan2(this.lastDir.y, this.lastDir.x);
    const w = this.weaponDef;
    if (this.scene._stats) this.scene._stats.shots += w.pellets;
    for (let i = 0; i < w.pellets; i++) {
      this._fireBullet(baseAngle + (Math.random() - 0.5) * w.spread);
    }


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

  // Tiro: usa o shoot.mp3 (gravação nítida) variando pitch (rate) e volume
  // por arma — assim cada arma soa diferente sem ficar abafado.
  _playShot() {
    // Laser: zap sintetizado (arma de energia, não é tiro de pólvora)
    if (this.weaponKey === 'laser') {
      const mgr = this.scene.sound;
      const ctx = mgr?.context;
      if (ctx && ctx.state !== 'closed' && !mgr.mute) {
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.value = mgr.volume ?? 1;
        master.connect(ctx.destination);
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(1300, now);
        o.frequency.exponentialRampToValueAtTime(170, now + 0.18);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.22, now + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
        o.connect(g); g.connect(master);
        o.start(now); o.stop(now + 0.22);
        return;
      }
    }

    const p = SHOT[this.weaponKey] ?? SHOT.pistol;
    this.scene.sound.play('sfx-shoot', { volume: p.vol, rate: p.rate });
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
    // Origem na boca do cano da arma (grip + tip), na altura da mão
    const muzz = HAND_OFF + WEAPON_ART.laser.tip;
    const bx  = this.sprite.x + cos * muzz;
    const by  = this.sprite.y + sin * muzz + HAND_DROP;

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
      if (this.scene._stats) this.scene._stats.hits++;
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
    this.scene.sound.play('sfx-reload', { volume: 0.40 });

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
    this._applyGunTexture(key);
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
    this.scene.sound.play('sfx-player-hurt', { volume: 0.55 });

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

    // Janela única de i-frame (compartilhada com o dash) — nunca encurta
    this._iframeUntil = Math.max(this._iframeUntil || 0, this.scene.time.now + PLAYER.IFRAME_MS);
    this.isInvincible = true;
    this.scene.time.delayedCall(PLAYER.IFRAME_MS, () => this._stopHurtBlink());

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
    if (this._gunImg) this._gunImg.setVisible(false);

    this._stopHurtBlink();
    this.sprite.setVelocity(0, 0);
    this.sprite.setAlpha(1);
    this.sprite.play(`${SKIN}-death`, true);
    this.scene.sound.play('sfx-player-death', { volume: 0.60 });

    this._deathFX();

    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.time.delayedCall(300, () => this.scene.events.emit(EVT.PLAYER_DEAD));
    });
    this.scene.time.delayedCall(1200, () => this.scene.events.emit(EVT.PLAYER_DEAD));
  }

  // Morte cinematográfica: slow-mo, flash, zoom, explosão de partículas
  _deathFX() {
    const s   = this.scene;
    const cam = s.cameras.main;
    const px  = this.sprite.x, py = this.sprite.y;

    // Flash branco forte + shake + zoom lento na morte
    cam.flash(180, 255, 255, 255, false);
    cam.shake(420, 0.018);
    cam.zoomTo(1.12, 1100, 'Sine.easeInOut');
    s.time.delayedCall(1400, () => cam.zoomTo(1, 500));

    // Anel de choque
    const ring = s.add.graphics().setDepth(DEPTH.FX + 3);
    ring.lineStyle(4, 0xff3322, 0.9);
    ring.strokeCircle(px, py, 10);
    s.tweens.add({
      targets: ring, scaleX: 6, scaleY: 6, alpha: 0,
      duration: 600, ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Explosão de partículas (coroa partida + faíscas douradas/vermelhas)
    const g = s.add.graphics().setDepth(DEPTH.FX + 3);
    const bits = [];
    for (let i = 0; i < 22; i++) {
      const a   = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 160;
      bits.push({
        x: px, y: py,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        col: [0xffd740, 0xff8800, 0xff2244, 0xffffff][i % 4],
        r: 2 + Math.random() * 3, life: 1,
      });
    }
    const ev = s.time.addEvent({
      delay: 16, repeat: 55,
      callback: () => {
        g.clear();
        for (const b of bits) {
          b.vy += 12;          // gravidade
          b.x += b.vx * 0.016;
          b.y += b.vy * 0.016;
          b.life -= 0.018;
          if (b.life <= 0) continue;
          g.fillStyle(b.col, Math.max(0, b.life));
          g.fillCircle(b.x, b.y, b.r);
        }
      },
      callbackScope: this,
    });
    s.time.delayedCall(1100, () => { ev.remove(); g.destroy(); });

    // Vinheta escura crescendo
    const { WIDTH: W, HEIGHT: H } = this.scene.scale.gameSize;
    const vig = s.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setScrollFactor(0).setDepth(DEPTH.FX + 2);
    s.tweens.add({ targets: vig, fillAlpha: 0.45, duration: 1000 });
    s.time.delayedCall(1300, () => vig.destroy());
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
