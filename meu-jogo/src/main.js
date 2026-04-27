import * as Phaser from 'phaser';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTES GLOBAIS
// ═══════════════════════════════════════════════════════════════════
const W = 800;
const H = 600;

const MAP_MARGIN   = 32;
const MAP_W        = W - MAP_MARGIN * 2;
const MAP_H        = H - MAP_MARGIN * 2;

const PLAYER_SPEED      = 200;
const BULLET_SPEED      = 500;
const SHOOT_COOLDOWN    = 300;   // ms entre tiros
const PLAYER_MAX_HEALTH = 100;
const CLIP_SIZE         = 10;
const RELOAD_TIME       = 2000; // ms

const ENEMY_BASE_HEALTH = 100;
const ENEMY_BASE_SPEED  = 55;
const ENEMY_DAMAGE_PS   = 20;   // dano por segundo ao encostar
const BULLET_DAMAGE     = 25;
const POINTS_PER_KILL   = 100;

const ROUND_START_DELAY = 4000; // ms de aviso antes do round
const ENEMY_SPAWN_DELAY = 600;  // ms entre cada spawn

// ═══════════════════════════════════════════════════════════════════
//  PALETA
// ═══════════════════════════════════════════════════════════════════
const C = {
  bg:         0x0a0a0f,
  floor:      0x12120a,
  floorLine:  0x1e1e14,
  wall:       0x8b1a00,
  wallLight:  0xff3300,
  gold:       0xd4a000,
  goldLight:  0xffd740,
  red:        0xcc1100,
  green:      0x22cc44,
  orange:     0xff8800,
  hud:        0x0f0f18,
  hudBorder:  0x2a1500,
};

// ═══════════════════════════════════════════════════════════════════
//  HELPER: pixel art via Graphics -> RenderTexture
// ═══════════════════════════════════════════════════════════════════
function pixelArt(scene, key, pixels, pw) {
  const rows = pixels.length;
  const cols = pixels[0].length;
  const rt = scene.add.renderTexture(0, 0, cols * pw, rows * pw);
  const g  = scene.add.graphics();

  const palette = {
    // Palhaço
    'R': 0xcc1100, 'r': 0xff5533, 'W': 0xffffff, 'w': 0xf0e0d0,
    'K': 0x111111, 'Y': 0xffdd00, 'y': 0xd4a000, 'G': 0x228800,
    'N': 0x3b1a00, 'n': 0x6b3a10, 'S': 0xee2200,
    // Rei
    'C': 0xd4a000, 'P': 0xffd740, 'F': 0xf5c890, 'f': 0xd4946a,
    'M': 0x8b1a00, 'm': 0x5a1000, 'b': 0x1a1a1a, 'T': 0xcc3300,
    'L': 0xffe0a0,
    // Bala
    'O': 0xffcc00, 'o': 0xff8800,
  };

  pixels.forEach((row, ry) => {
    for (let cx = 0; cx < row.length; cx++) {
      const ch = row[cx];
      if (ch === ' ') continue;
      g.fillStyle(palette[ch] ?? 0xff00ff, 1);
      g.fillRect(cx * pw, ry * pw, pw, pw);
    }
  });

  rt.draw(g, 0, 0);
  rt.saveTexture(key);
  g.destroy();
  rt.destroy();
}

// ═══════════════════════════════════════════════════════════════════
//  CENA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.playerHealth  = PLAYER_MAX_HEALTH;
    this.playerAmmo    = CLIP_SIZE;
    this.isReloading   = false;
    this.canShoot      = true;
    this.lastDir       = new Phaser.Math.Vector2(1, 0);
    this.score         = 0;
    this.round         = 0;
    this.isGameOver    = false;
    this.roundActive   = false;
    this.enemiesLeft   = 0;
  }

  // ──────────────────────────────────────────────────────────────────
  create() {
    this._makeTextures();
    this._buildMap();
    this._buildPlayer();
    this._buildGroups();
    this._buildControls();
    this._buildHUD();
    this._buildCollisions();
    this._startRound();
  }

  update(_t, delta) {
    if (this.isGameOver) return;
    this._movePlayer();
    this._handleShooting();
    this._moveEnemies();
    this._applyEnemyDamage(delta);
    this._refreshHUD();
    this._cleanupBullets();

    if (this.roundActive &&
        this.enemiesLeft <= 0 &&
        this.enemies.countActive() === 0) {
      this._endRound();
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  TEXTURAS
  // ══════════════════════════════════════════════════════════════════
  _makeTextures() {
    // Rei (player) 11 cols x 14 rows
    pixelArt(this, 'king', [
      '   KPPPPK   ',
      '  KPPP KPPK ',
      ' KPPPKPPPPK ',
      ' KCCCCCCCK  ',
      '  KFFFFFFK  ',
      '  KFKKFFfK  ',
      '  KFbbFFfK  ',
      '  KFFFFffK  ',
      '  KFFFfMK   ',
      ' KMFFFfMMK  ',
      ' MMFFFFfMM  ',
      ' KMmmmmMMK  ',
      '  KbbbbKK   ',
      '  Kb   bK   ',
    ], 4);

    // Palhaço (inimigo) 11 cols x 14 rows
    pixelArt(this, 'clown', [
      '  KRRRRK    ',
      ' KRRrrRRK   ',
      ' KRRrrRRK   ',
      ' KWWWwWWK   ',
      '  KwGGwK    ',
      '  KwKKwK    ',
      '  KwSSrK    ',
      '  KwwwwK    ',
      '  KwwwwK    ',
      ' KSSWwSSK   ',
      ' KSSyySSSK  ',
      ' KNyyNyNK   ',
      '  KNNN NK   ',
      '  KN   NK   ',
    ], 4);

    // Bala
    pixelArt(this, 'bullet', [
      ' oO ',
      'oOOo',
      ' oO ',
    ], 3);
  }

  // ══════════════════════════════════════════════════════════════════
  //  MAPA FIXO (Requisito 2)
  // ══════════════════════════════════════════════════════════════════
  _buildMap() {
    this.cameras.main.setBackgroundColor('#0a0a0f');
    const g = this.add.graphics();

    // Chão
    g.fillStyle(C.floor, 1);
    g.fillRect(MAP_MARGIN, MAP_MARGIN, MAP_W, MAP_H);

    // Grade de tijolos
    const TW = 40, TH = 20;
    g.lineStyle(1, C.floorLine, 1);
    for (let row = 0; row * TH < MAP_H; row++) {
      const y = MAP_MARGIN + row * TH;
      const offset = row % 2 === 0 ? 0 : TW / 2;
      for (let col = -1; col * TW < MAP_W + TW; col++) {
        const x = MAP_MARGIN + col * TW - offset;
        g.strokeRect(x, y, TW, TH);
      }
    }

    // Sombras de borda (atmosfera)
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.4);
    sh.fillRect(MAP_MARGIN, MAP_MARGIN, MAP_W, 44);
    sh.fillRect(MAP_MARGIN, MAP_MARGIN + MAP_H - 44, MAP_W, 44);
    sh.fillRect(MAP_MARGIN, MAP_MARGIN, 44, MAP_H);
    sh.fillRect(MAP_MARGIN + MAP_W - 44, MAP_MARGIN, 44, MAP_H);

    // Paredes
    g.lineStyle(6, C.wall, 1);
    g.strokeRect(MAP_MARGIN, MAP_MARGIN, MAP_W, MAP_H);
    g.lineStyle(2, C.wallLight, 0.5);
    g.strokeRect(MAP_MARGIN + 3, MAP_MARGIN + 3, MAP_W - 6, MAP_H - 6);

    // Cantos dourados
    g.lineStyle(3, C.gold, 1);
    const corners = [
      [MAP_MARGIN,          MAP_MARGIN,           1,  1],
      [MAP_MARGIN + MAP_W,  MAP_MARGIN,           -1,  1],
      [MAP_MARGIN,          MAP_MARGIN + MAP_H,   1, -1],
      [MAP_MARGIN + MAP_W,  MAP_MARGIN + MAP_H,  -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      g.lineBetween(cx, cy, cx + dx * 28, cy);
      g.lineBetween(cx, cy, cx, cy + dy * 28);
      g.fillStyle(C.goldLight, 1);
      g.fillRect(cx - 3, cy - 3, 6, 6);
    }

    // Cruz central decorativa
    g.lineStyle(1, C.gold, 0.15);
    g.lineBetween(W / 2 - 20, H / 2, W / 2 + 20, H / 2);
    g.lineBetween(W / 2, H / 2 - 20, W / 2, H / 2 + 20);
    g.strokeCircle(W / 2, H / 2, 6);
  }

  // ══════════════════════════════════════════════════════════════════
  //  PLAYER (Requisitos 5, 15, 19)
  // ══════════════════════════════════════════════════════════════════
  _buildPlayer() {
    this.physics.world.setBounds(
      MAP_MARGIN + 4, MAP_MARGIN + 4,
      MAP_W - 8, MAP_H - 8
    );
    this.player = this.physics.add.sprite(W / 2, H / 2, 'king');
    this.player.setCollideWorldBounds(true).setDepth(5);
    this.playerShadow = this.add.ellipse(W / 2, H / 2 + 26, 30, 10, 0x000000, 0.45).setDepth(4);
  }

  _buildGroups() {
    this.enemies = this.physics.add.group();
    this.bullets  = this.physics.add.group();
  }

  _buildControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys    = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      R: Phaser.Input.Keyboard.KeyCodes.R,
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  HUD (Requisitos 1, 8, 9)
  // ══════════════════════════════════════════════════════════════════
  _buildHUD() {
    const Y = 6;
    const font7  = { fontFamily: '"Courier New", monospace', fontSize: '7px',  color: '#aaaaaa' };
    const fontPS = (sz, color) => ({
      fontFamily: '"Courier New", monospace',
      fontSize: sz, color,
      stroke: '#000', strokeThickness: 3,
    });

    // ── Painel esquerdo (Vida + Ammo) ─────────────────────────────────
    const lBg = this.add.graphics().setDepth(20);
    lBg.fillStyle(C.hud, 0.93);
    lBg.fillRoundedRect(MAP_MARGIN, Y, 238, 54, 5);
    lBg.lineStyle(1, C.hudBorder, 1);
    lBg.strokeRoundedRect(MAP_MARGIN, Y, 238, 54, 5);

    // Vida
    this.add.text(MAP_MARGIN + 6, Y + 4, '❤ VIDA', { ...font7, color: '#ff5555' }).setDepth(21);
    this.add.rectangle(MAP_MARGIN + 72, Y + 6, 154, 13, 0x330000).setOrigin(0, 0).setDepth(21);
    this._hpBar  = this.add.rectangle(MAP_MARGIN + 72, Y + 6, 154, 13, C.green).setOrigin(0, 0).setDepth(22);
    this._hpText = this.add.text(MAP_MARGIN + 228, Y + 5, '100', fontPS('10px', '#fff')).setOrigin(1, 0).setDepth(22);

    // Ammo
    this.add.text(MAP_MARGIN + 6, Y + 28, '🔫 AMMO', { ...font7, color: '#ffdd44' }).setDepth(21);
    this._ammoIcons = [];
    for (let i = 0; i < CLIP_SIZE; i++) {
      const ic = this.add.rectangle(MAP_MARGIN + 72 + i * 15, Y + 30, 11, 11, C.goldLight)
        .setOrigin(0, 0).setDepth(22);
      this._ammoIcons.push(ic);
    }
    this._reloadText = this.add.text(MAP_MARGIN + 72, Y + 30, '', fontPS('9px', '#ff8800')).setDepth(22);

    // ── Painel direito (Score + Round) ────────────────────────────────
    const rBg = this.add.graphics().setDepth(20);
    rBg.fillStyle(C.hud, 0.93);
    rBg.fillRoundedRect(W - MAP_MARGIN - 210, Y, 210, 54, 5);
    rBg.lineStyle(1, C.hudBorder, 1);
    rBg.strokeRoundedRect(W - MAP_MARGIN - 210, Y, 210, 54, 5);

    this.add.text(W - MAP_MARGIN - 206, Y + 4,  '⭐ PONTOS', { ...font7, color: '#ffd740' }).setDepth(21);
    this._scoreText = this.add.text(W - MAP_MARGIN - 10, Y + 4,  '0',
      fontPS('11px', '#ffd740')).setOrigin(1, 0).setDepth(22);

    this.add.text(W - MAP_MARGIN - 206, Y + 28, '⚔  ROUND',  { ...font7, color: '#ff8800' }).setDepth(21);
    this._roundText = this.add.text(W - MAP_MARGIN - 10, Y + 28, '1',
      fontPS('11px', '#ff8800')).setOrigin(1, 0).setDepth(22);

    // Inimigos restantes (centro)
    this._enemyCountText = this.add.text(W / 2, Y + 8, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px', color: '#ff5555',
    }).setOrigin(0.5, 0).setDepth(22);

    // Banners de round
    this._roundBanner = this.add.text(W / 2, H / 2 - 30, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '30px', color: '#ffd740',
      stroke: '#000', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(30).setAlpha(0);

    this._roundSub = this.add.text(W / 2, H / 2 + 18, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px', color: '#ff8800',
    }).setOrigin(0.5).setDepth(30).setAlpha(0);

    // Hint
    this.add.text(W / 2, H - 8, 'WASD / setas  mover   |   ESPAÇO  atirar   |   R  recarregar', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px', color: '#ffffff22',
    }).setOrigin(0.5, 1).setDepth(20);
  }

  _buildCollisions() {
    this.physics.add.overlap(this.bullets, this.enemies, this._hitEnemy, null, this);
  }

  // ══════════════════════════════════════════════════════════════════
  //  ROUNDS (Requisitos 3, 4, 9)
  // ══════════════════════════════════════════════════════════════════
  _startRound() {
    if (this.isGameOver) return;
    this.round++;
    this.roundActive = false;

    const count      = this._enemiesForRound(this.round);
    this.enemiesLeft = count;

    this._roundBanner.setText(`ROUND  ${this.round}`);
    this._roundSub.setText(`${count} palhaços se aproximando...`);

    this.tweens.add({
      targets: [this._roundBanner, this._roundSub],
      alpha: 1, duration: 400,
      onComplete: () => {
        this.time.delayedCall(ROUND_START_DELAY - 800, () => {
          this.tweens.add({
            targets: [this._roundBanner, this._roundSub],
            alpha: 0, duration: 500,
            onComplete: () => {
              this._spawnRound(count);
              this.roundActive = true;
            },
          });
        });
      },
    });
  }

  _enemiesForRound(r) {
    // 4, 6, 8... cap 30
    return Math.min(4 + (r - 1) * 2, 30);
  }

  _spawnRound(total) {
    let spawned = 0;
    const next = () => {
      if (spawned >= total || this.isGameOver) return;
      this._spawnEnemy();
      spawned++;
      this.time.delayedCall(ENEMY_SPAWN_DELAY, next);
    };
    next();
  }

  _spawnEnemy() {
    const side = Phaser.Math.Between(0, 3);
    const pad  = 52;
    let ex, ey;
    if      (side === 0) { ex = Phaser.Math.Between(MAP_MARGIN + pad, MAP_MARGIN + MAP_W - pad); ey = MAP_MARGIN + pad; }
    else if (side === 1) { ex = MAP_MARGIN + MAP_W - pad; ey = Phaser.Math.Between(MAP_MARGIN + pad, MAP_MARGIN + MAP_H - pad); }
    else if (side === 2) { ex = Phaser.Math.Between(MAP_MARGIN + pad, MAP_MARGIN + MAP_W - pad); ey = MAP_MARGIN + MAP_H - pad; }
    else                 { ex = MAP_MARGIN + pad; ey = Phaser.Math.Between(MAP_MARGIN + pad, MAP_MARGIN + MAP_H - pad); }

    const hp    = ENEMY_BASE_HEALTH + (this.round - 1) * 20;
    const speed = Math.min(ENEMY_BASE_SPEED + (this.round - 1) * 5, 130);

    const e       = this.enemies.create(ex, ey, 'clown');
    e.health      = hp;
    e.maxHealth   = hp;
    e.speed       = speed;
    e.setDepth(5).setAlpha(0);

    e.shadow = this.add.ellipse(ex, ey + 26, 26, 8, 0x000000, 0.4).setDepth(4);
    e.hpBg   = this.add.rectangle(ex, ey - 30, 36, 5, 0x440000).setDepth(6);
    e.hpBar  = this.add.rectangle(ex - 18, ey - 30, 36, 5, C.green).setOrigin(0, 0.5).setDepth(7);

    this.tweens.add({ targets: e, alpha: 1, duration: 300 });
  }

  _endRound() {
    this.roundActive = false;
    if (this.isGameOver) return;

    // Auto-reload entre rounds
    this.playerAmmo  = CLIP_SIZE;
    this.isReloading = false;
    this.canShoot    = true;
    this._reloadText.setText('');

    this._roundBanner.setText(`ROUND ${this.round}  OK!`);
    this._roundSub.setText('Preparando próxima horda...');
    this.tweens.add({
      targets: [this._roundBanner, this._roundSub],
      alpha: 1, duration: 400,
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: [this._roundBanner, this._roundSub],
            alpha: 0, duration: 400,
            onComplete: () => this._startRound(),
          });
        });
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  MOVIMENTAÇÃO (Requisito 5, 19)
  // ══════════════════════════════════════════════════════════════════
  _movePlayer() {
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown  || this.keys.A.isDown) vx = -PLAYER_SPEED;
    if (this.cursors.right.isDown || this.keys.D.isDown) vx =  PLAYER_SPEED;
    if (this.cursors.up.isDown    || this.keys.W.isDown) vy = -PLAYER_SPEED;
    if (this.cursors.down.isDown  || this.keys.S.isDown) vy =  PLAYER_SPEED;

    if (vx !== 0 && vy !== 0) { vx *= 0.7071; vy *= 0.7071; }

    this.player.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.lastDir.set(vx, vy).normalize();
      this.player.setFlipX(vx < 0);
    }

    this.playerShadow.setPosition(this.player.x, this.player.y + 26);
  }

  // ══════════════════════════════════════════════════════════════════
  //  ATAQUE (Requisito 6)
  // ══════════════════════════════════════════════════════════════════
  _handleShooting() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.R) && !this.isReloading && this.playerAmmo < CLIP_SIZE) {
      this._reload(); return;
    }
    if (!Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) return;
    if (!this.canShoot || this.isReloading) return;

    if (this.playerAmmo <= 0) { this._reload(); return; }

    this.playerAmmo--;

    const b = this.bullets.create(this.player.x, this.player.y, 'bullet');
    b.setDepth(6);
    b.setVelocity(this.lastDir.x * BULLET_SPEED, this.lastDir.y * BULLET_SPEED);

    this.cameras.main.flash(40, 255, 220, 100, false);

    this.canShoot = false;
    this.time.delayedCall(SHOOT_COOLDOWN, () => { this.canShoot = true; });

    if (this.playerAmmo <= 0) this._reload();
  }

  _reload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.canShoot    = false;
    this._reloadText.setText('RECARREGANDO...');
    this.time.delayedCall(RELOAD_TIME, () => {
      this.playerAmmo  = CLIP_SIZE;
      this.isReloading = false;
      this.canShoot    = true;
      this._reloadText.setText('');
    });
  }

  _moveEnemies() {
    this.enemies.getChildren().forEach(e => {
      this.physics.moveToObject(e, this.player, e.speed);
      e.setFlipX(e.body.velocity.x < 0);
      if (e.shadow) e.shadow.setPosition(e.x, e.y + 26);
      if (e.hpBg)   e.hpBg.setPosition(e.x, e.y - 30);
      if (e.hpBar)  e.hpBar.setPosition(e.x - 18, e.y - 30);
    });
  }

  _applyEnemyDamage(delta) {
    const close = this.enemies.getChildren().filter(e =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < 28
    );
    if (close.length === 0) return;

    this.playerHealth -= (ENEMY_DAMAGE_PS * delta / 1000) * close.length;

    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      this._gameOver();
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  ACERTO DE BALA (Requisito 7)
  // ══════════════════════════════════════════════════════════════════
  _hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.health -= BULLET_DAMAGE;

    if (enemy.hpBar) {
      const pct = Math.max(0, enemy.health / enemy.maxHealth);
      enemy.hpBar.width      = 36 * pct;
      enemy.hpBar.fillColor  = pct > 0.5 ? 0x22cc44 : pct > 0.25 ? 0xff8800 : 0xff2200;
    }

    if (enemy.health <= 0) {
      this._killEnemy(enemy);
    } else {
      this.tweens.add({
        targets: enemy,
        x: enemy.x + this.lastDir.x * 8,
        y: enemy.y + this.lastDir.y * 8,
        duration: 55, yoyo: true,
      });
    }
  }

  _killEnemy(enemy) {
    // Explosão de partículas
    const g = this.add.graphics().setDepth(8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = Phaser.Math.Between(10, 26);
      g.fillStyle(i % 2 === 0 ? 0xff3300 : 0xffdd00, 1);
      g.fillCircle(enemy.x + Math.cos(a) * d, enemy.y + Math.sin(a) * d, 3);
    }
    this.time.delayedCall(200, () => g.destroy());

    // Texto flutuante de pontos
    const pt = this.add.text(enemy.x, enemy.y - 12, `+${POINTS_PER_KILL}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px', color: '#ffd740',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(15);
    this.tweens.add({
      targets: pt, y: enemy.y - 44, alpha: 0,
      duration: 750, ease: 'Power2',
      onComplete: () => pt.destroy(),
    });

    if (enemy.shadow) enemy.shadow.destroy();
    if (enemy.hpBg)   enemy.hpBg.destroy();
    if (enemy.hpBar)  enemy.hpBar.destroy();
    enemy.destroy();

    this.score      += POINTS_PER_KILL;
    this.enemiesLeft = Math.max(0, this.enemiesLeft - 1);
  }

  // ══════════════════════════════════════════════════════════════════
  //  HUD REFRESH (Requisito 1)
  // ══════════════════════════════════════════════════════════════════
  _refreshHUD() {
    const hPct = this.playerHealth / PLAYER_MAX_HEALTH;
    this._hpBar.width     = 154 * hPct;
    this._hpBar.fillColor = hPct > 0.5 ? C.green : hPct > 0.25 ? C.orange : C.red;
    this._hpText.setText(Math.ceil(this.playerHealth).toString());

    for (let i = 0; i < CLIP_SIZE; i++) {
      this._ammoIcons[i].fillColor = i < this.playerAmmo ? C.goldLight : 0x2a2a2a;
    }

    this._scoreText.setText(this.score.toLocaleString('pt-BR'));
    this._roundText.setText(this.round.toString());

    const alive = this.enemies.countActive();
    this._enemyCountText.setText(
      this.roundActive && alive > 0 ? `☠ ${alive} inimigos restantes` : ''
    );
  }

  _cleanupBullets() {
    this.bullets.getChildren().forEach(b => {
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) b.destroy();
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  GAME OVER (Requisitos 16, 17)
  // ══════════════════════════════════════════════════════════════════
  _gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.physics.pause();

    this.enemies.getChildren().forEach(e => {
      if (e.shadow) e.shadow.destroy();
      if (e.hpBg)   e.hpBg.destroy();
      if (e.hpBar)  e.hpBar.destroy();
    });

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(40);
    this.tweens.add({ targets: overlay, fillAlpha: 0.82, duration: 700 });

    this.time.delayedCall(500, () => {
      const fontGO = {
        fontFamily: '"Courier New", monospace',
        stroke: '#000', strokeThickness: 8,
      };

      this.add.text(W / 2, H / 2 - 90, 'GAME  OVER', {
        ...fontGO, fontSize: '44px', color: '#ff2200',
      }).setOrigin(0.5).setDepth(41);

      this.add.text(W / 2, H / 2 - 36, 'Os palhaços venceram...', {
        fontFamily: '"Courier New", monospace',
        fontSize: '15px', color: '#ffaa00',
      }).setOrigin(0.5).setDepth(41);

      this.add.text(W / 2, H / 2 + 4, `Pontuação: ${this.score.toLocaleString('pt-BR')}`, {
        ...fontGO, fontSize: '13px', color: '#ffd740', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(41);

      this.add.text(W / 2, H / 2 + 36, `Rounds: ${this.round}`, {
        ...fontGO, fontSize: '11px', color: '#ff8800', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(41);

      // Botão restart
      const btn = this.add.rectangle(W / 2, H / 2 + 90, 220, 40, 0x8b1a00)
        .setDepth(41).setStrokeStyle(2, C.wallLight)
        .setInteractive({ useHandCursor: true });

      this.add.text(W / 2, H / 2 + 90, 'JOGAR NOVAMENTE', {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(42);

      btn.on('pointerover',  () => btn.setFillStyle(0xcc2200));
      btn.on('pointerout',   () => btn.setFillStyle(0x8b1a00));
      btn.on('pointerdown',  () => this.scene.restart());
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#0a0a0f',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: GameScene,
};

new Phaser.Game(config);
