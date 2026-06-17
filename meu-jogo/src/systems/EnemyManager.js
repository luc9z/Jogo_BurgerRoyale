import Phaser from 'phaser';
import Enemy from '../entities/Enemy.js';
import { GAME, ARENA, ROUND, ENEMY, BULLET, EVT, ENEMY_TYPES } from '../constants.js';

export default class EnemyManager {
  constructor(scene) {
    this.scene       = scene;
    this.enemies     = [];
    this.round       = 0;
    this.roundActive = false;
    this._spawnLeft  = 0;
    this._ending     = false;
  }

  startRound() {
    this.round++;
    this.roundActive = false;
    this._ending     = false;

    const count = Math.min(
      ROUND.BASE_COUNT + (this.round - 1) * ROUND.PER_ROUND,
      ROUND.MAX_COUNT,
    );
    this._spawnLeft = count;

    this.scene.events.emit('round-changed', this.round);
    this.scene.events.emit('show-round-banner', this.round, count);

    this.scene.time.delayedCall(ROUND.WARN_MS, () => {
      this._spawnWave(count);
      this.roundActive = true;
    });
  }

  _spawnWave(total) {
    let spawned    = 0;
    const isBoss   = this.round >= 3 && this.round % 3 === 0;
    const spawnMs  = Math.max(160, ROUND.SPAWN_MS - (this.round - 1) * 28);

    if (isBoss) {
      this.scene.events.emit('show-boss-warning');
    }

    const next = () => {
      if (spawned >= total) return;
      if (spawned === 0 && isBoss) this._spawnBoss();
      else this._spawnOne();
      spawned++;
      this.scene.time.delayedCall(spawnMs, next);
    };
    next();
  }

  _spawnBoss() {
    this._spawnLeft = Math.max(0, this._spawnLeft - 1);
    const bx = ARENA.X + ARENA.W / 2;
    const by = ARENA.Y + 90;
    this.enemies.push(new Enemy(this.scene, bx, by, this.round, 'clown-boss'));
  }

  _pickType() {
    const r = this.round;
    const roll = Math.random();

    // Round 1: só palhaços normais
    if (r === 1) return 'clown';

    // Round 2+: introduce magro
    if (r === 2) return roll < 0.25 ? 'clown-skinny' : 'clown';

    // Round 3+: introduce gordo
    const fatChance    = Math.min(0.05 * (r - 2), 0.30);
    const skinnyChance = Math.min(0.10 * (r - 1), 0.35);

    if (roll < fatChance) return 'clown-fat';
    if (roll < fatChance + skinnyChance) return 'clown-skinny';
    return 'clown';
  }

  _spawnOne() {
    this._spawnLeft = Math.max(0, this._spawnLeft - 1);

    const pad = 80;
    const side = Phaser.Math.Between(0, 3);
    const ax = ARENA.X + pad, ay = ARENA.Y + pad;
    const aw = ARENA.W - pad * 2, ah = ARENA.H - pad * 2;
    let ex, ey;
    if      (side === 0) { ex = Phaser.Math.Between(ax, ax + aw); ey = ARENA.Y + pad; }
    else if (side === 1) { ex = ARENA.X + ARENA.W - pad; ey = Phaser.Math.Between(ay, ay + ah); }
    else if (side === 2) { ex = Phaser.Math.Between(ax, ax + aw); ey = ARENA.Y + ARENA.H - pad; }
    else                 { ex = ARENA.X + pad; ey = Phaser.Math.Between(ay, ay + ah); }

    const type = this._pickType();
    this._showSpawnMarker(ex, ey, false, () => {
      this.enemies.push(new Enemy(this.scene, ex, ey, this.round, type));
    });
  }

  // Marcador pulsante antes do spawn (evita inimigo aparecer do nada)
  _showSpawnMarker(x, y, isBoss, onDone) {
    const s = this.scene;
    const color  = isBoss ? 0xff2200 : 0xff8800;
    const radius = isBoss ? 40 : 22;
    const delay  = isBoss ? 900 : 520;

    const ring = s.add.graphics().setDepth(GAME.DEPTH_FX ?? 9);
    ring.lineStyle(isBoss ? 3 : 2, color, 0.9);
    ring.strokeCircle(x, y, radius);

    const cross1 = s.add.graphics().setDepth(9);
    cross1.lineStyle(isBoss ? 2.5 : 1.5, color, 0.8);
    cross1.lineBetween(x - 10, y, x + 10, y);
    cross1.lineBetween(x, y - 10, x, y + 10);

    s.tweens.add({
      targets: [ring, cross1],
      scaleX: isBoss ? 1.6 : 1.4, scaleY: isBoss ? 1.6 : 1.4,
      alpha: 0,
      duration: delay,
      ease: 'Quad.easeIn',
      onComplete: () => {
        ring.destroy();
        cross1.destroy();
        onDone();
      },
    });
  }

  update(tx, ty) {
    this.enemies = this.enemies.filter(e => {
      if (!e.isDead) return true;
      return e.sprite?.active === true;
    });

    for (const e of this.enemies) {
      if (!e.isDead) e.update(tx, ty);
    }

    this._applySeparation();
  }

  _applySeparation() {
    const SEP_DIST = 56;
    const FORCE    = 115;
    const alive    = this.enemies.filter(e => !e.isDead);

    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      if (!a.sprite?.body) continue;
      let fx = 0, fy = 0;

      for (let j = 0; j < alive.length; j++) {
        if (i === j) continue;
        const b  = alive[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d  = Math.hypot(dx, dy);
        if (d < SEP_DIST && d > 0.5) {
          const str = (SEP_DIST - d) / SEP_DIST;
          fx += (dx / d) * FORCE * str;
          fy += (dy / d) * FORCE * str;
        }
      }

      if (fx !== 0 || fy !== 0) {
        const v = a.sprite.body.velocity;
        a.sprite.body.setVelocity(v.x + fx, v.y + fy);
      }
    }
  }

  checkBulletHits(bullets) {
    const list = bullets.slice();
    for (const b of list) {
      if (!b?.active) continue;

      // Fora da tela
      if (b.x < -40 || b.x > GAME.WIDTH+40 || b.y < -40 || b.y > GAME.HEIGHT+40) {
        b.destroy(); continue;
      }

      // Limite de alcance da arma
      if (b._range !== undefined) {
        if (Phaser.Math.Distance.Between(b._ox, b._oy, b.x, b.y) > b._range) {
          b.destroy(); continue;
        }
      }

      for (const e of this.enemies) {
        if (e.isDead) continue;
        const d = Phaser.Math.Distance.Between(b.x, b.y, e.x, e.y);
        if (d < ENEMY.HIT_RADIUS) {
          const dx = e.x - b.x, dy = e.y - b.y;
          const len = Math.hypot(dx, dy) || 1;
          e.takeDamage(b._damage ?? BULLET.DAMAGE, { x: dx/len, y: dy/len });
          if (e.isDead) this.scene.events.emit(EVT.ENEMY_KILLED, e.points);
          b.destroy();
          break;
        }
      }
    }
  }

  applyContactDamage(player) {
    for (const e of this.enemies) {
      if (e.isDead) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (d < 34) {
        player.takeDamage(ENEMY.CONTACT_HEARTS);
        return;
      }
    }
  }

  isRoundComplete() {
    if (!this.roundActive || this._ending) return false;
    if (this._spawnLeft > 0) return false;
    return this.enemies.every(e => e.isDead);
  }

  endRound() {
    this._ending     = true;
    this.roundActive = false;
  }

  get aliveCount() {
    return this.enemies.filter(e => !e.isDead).length;
  }
}
