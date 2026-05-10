import Phaser from 'phaser';
import Enemy from '../entities/Enemy.js';
import { GAME, ARENA, ROUND, ENEMY, BULLET, EVT } from '../constants.js';

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
    let spawned = 0;
    const next = () => {
      if (spawned >= total) return;
      this._spawnOne();
      spawned++;
      this.scene.time.delayedCall(ROUND.SPAWN_MS, next);
    };
    next();
  }

  _spawnOne() {
    const pad = 60;
    const ax = ARENA.X + pad, ay = ARENA.Y + pad;
    const aw = ARENA.W - pad*2, ah = ARENA.H - pad*2;
    const side = Phaser.Math.Between(0, 3);
    let ex, ey;
    if      (side === 0) { ex = Phaser.Math.Between(ax, ax+aw); ey = ay; }
    else if (side === 1) { ex = ax+aw; ey = Phaser.Math.Between(ay, ay+ah); }
    else if (side === 2) { ex = Phaser.Math.Between(ax, ax+aw); ey = ay+ah; }
    else                 { ex = ax;    ey = Phaser.Math.Between(ay, ay+ah); }

    this.enemies.push(new Enemy(this.scene, ex, ey, this.round));
  }

  update(tx, ty) {
    // ✅ Remove apenas os que foram completamente destruídos (sprite inexistente)
    this.enemies = this.enemies.filter(e => {
      // Mantém se ainda está vivo OU se está morto mas sprite ainda existe (anim de morte)
      if (!e.isDead) return true;
      return e.sprite?.active === true;
    });

    for (const e of this.enemies) {
      if (!e.isDead) e.update(tx, ty);
    }
  }

  checkBulletHits(bullets) {
    const list = bullets.slice();
    for (const b of list) {
      if (!b?.active) continue;
      if (b.x < -40 || b.x > GAME.WIDTH+40 || b.y < -40 || b.y > GAME.HEIGHT+40) {
        b.destroy(); continue;
      }
      for (const e of this.enemies) {
        if (e.isDead) continue;
        const d = Phaser.Math.Distance.Between(b.x, b.y, e.x, e.y);
        if (d < ENEMY.HIT_RADIUS) {
          const dx = e.x - b.x, dy = e.y - b.y;
          const len = Math.hypot(dx, dy) || 1;
          e.takeDamage(BULLET.DAMAGE, { x: dx/len, y: dy/len });
          if (e.isDead) this.scene.events.emit(EVT.ENEMY_KILLED, ENEMY.POINTS);
          b.destroy();
          break;
        }
      }
    }
  }

  applyContactDamage(player, delta) {
    for (const e of this.enemies) {
      if (e.isDead) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (d < 34) {
        player.takeDamage((ENEMY.CONTACT_DPS * delta) / 1000);
        return;
      }
    }
  }

  isRoundComplete() {
    if (!this.roundActive || this._ending) return false;
    if (this._spawnLeft > 0) return false;
    // ✅ Round completo quando não há nenhum inimigo vivo
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
