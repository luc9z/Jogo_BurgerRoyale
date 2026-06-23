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
    this._pending    = 0; // marcadores de spawn "no ar" (inimigo ainda não criado)
    this._ending     = false;

    // IMPORTANTE: scene.events PERSISTE entre restarts do GameScene. Se o
    // listener não for removido no shutdown, cada novo EnemyManager acumula
    // mais um listener preso a uma instância antiga. Aí o chefe ativo emite
    // 'boss-spawn-minions' e os managers VELHOS também spawnam minions no
    // próprio array (que nunca recebe update) → palhaços congelados no mapa.
    this._onBossSpawnMinions = (bx, by, count) => this._spawnMinionsAt(bx, by, count);
    scene.events.on('boss-spawn-minions', this._onBossSpawnMinions);
    scene.events.once('shutdown', () => {
      scene.events.off('boss-spawn-minions', this._onBossSpawnMinions);
    });
  }

  // ── PONTOS DE SPAWN FIXOS ────────────────────────────────
  // 8 "portais" na borda da arena: 4 cantos + 4 meios das laterais.
  // Inimigos só surgem nesses lugares definidos (nunca do nada perto
  // do jogador). Calculado uma vez.
  _spawnPoints() {
    if (this._pts) return this._pts;
    const m  = 26; // margem da borda (surgem colados na parede)
    const x0 = ARENA.X + m,            x1 = ARENA.X + ARENA.W - m;
    const y0 = ARENA.Y + m,            y1 = ARENA.Y + ARENA.H - m;
    const xc = (x0 + x1) / 2,          yc = (y0 + y1) / 2;
    this._pts = [
      { x: x0, y: y0 }, { x: xc, y: y0 }, { x: x1, y: y0 }, // topo
      { x: x0, y: yc },                   { x: x1, y: yc },  // laterais
      { x: x0, y: y1 }, { x: xc, y: y1 }, { x: x1, y: y1 }, // base
    ];
    return this._pts;
  }

  // Marcadores estáticos permanentes — jogador vê de onde vêm os palhaços
  _drawPortals() {
    if (this._portalGfx) return;
    const g = this._portalGfx = this.scene.add.graphics().setDepth(1);
    for (const p of this._spawnPoints()) {
      g.fillStyle(0xff3300, 0.10); g.fillCircle(p.x, p.y, 26);
      g.lineStyle(2, 0xff5500, 0.35); g.strokeCircle(p.x, p.y, 20);
      g.lineStyle(1, 0xffaa00, 0.30);
      g.lineBetween(p.x - 7, p.y, p.x + 7, p.y);
      g.lineBetween(p.x, p.y - 7, p.x, p.y + 7);
    }
    // pulso suave de vida nos portais
    this.scene.tweens.add({
      targets: g, alpha: 0.55,
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // Escolhe portal — sempre longe do jogador (justo)
  _pickSpawn() {
    const pts = this._spawnPoints();
    if (this._px == null) return Phaser.Utils.Array.GetRandom(pts);
    const sorted = [...pts].sort((a, b) =>
      Phaser.Math.Distance.Between(b.x, b.y, this._px, this._py) -
      Phaser.Math.Distance.Between(a.x, a.y, this._px, this._py),
    );
    // entre os 4 mais distantes do jogador
    return Phaser.Utils.Array.GetRandom(sorted.slice(0, 4));
  }

  startRound() {
    this.round++;
    this.roundActive = false;
    this._ending     = false;
    this._pending    = 0;
    this._drawPortals();

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
    // Chefe lidera a horda a partir do round 3 (antes só em 3,6,9...).
    const isBoss   = this.round >= 3;
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
    // Chefe entra pelo portal do topo-centro
    const p = this._spawnPoints()[1];
    this._pending++;
    this._showSpawnMarker(p.x, p.y, true, () => {
      this.enemies.push(new Enemy(this.scene, p.x, p.y, this.round, 'clown-boss'));
      this._pending = Math.max(0, this._pending - 1);
    });
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
    // Round 4+: tanque roxo (raro, fica mais comum no infinito)
    const tankChance   = r >= 4 ? Math.min(0.04 * (r - 3), 0.20) : 0;

    if (roll < tankChance) return 'clown-tank';
    if (roll < tankChance + fatChance) return 'clown-fat';
    if (roll < tankChance + fatChance + skinnyChance) return 'clown-skinny';
    return 'clown';
  }

  _spawnOne() {
    this._spawnLeft = Math.max(0, this._spawnLeft - 1);

    const { x: ex, y: ey } = this._pickSpawn();
    const type = this._pickType();
    this._pending++;
    this._showSpawnMarker(ex, ey, false, () => {
      this.enemies.push(new Enemy(this.scene, ex, ey, this.round, type));
      this._pending = Math.max(0, this._pending - 1);
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
    this._px = tx; this._py = ty;
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
        if (d < e.hitRadius) {
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
      if (d < Math.max(34, e.hitRadius * 0.6)) {
        player.takeDamage(ENEMY.CONTACT_HEARTS);
        return;
      }
    }
  }

  isRoundComplete() {
    if (!this.roundActive || this._ending) return false;
    if (this._spawnLeft > 0) return false;
    if (this._pending > 0) return false; // ainda há inimigos por nascer
    return this.enemies.every(e => e.isDead);
  }

  endRound() {
    this._ending     = true;
    this.roundActive = false;
  }

  _spawnMinionsAt(bx, by, count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r  = 80 + Math.random() * 50;
      const mx = Phaser.Math.Clamp(bx + Math.cos(angle) * r, ARENA.X + 60, ARENA.X + ARENA.W - 60);
      const my = Phaser.Math.Clamp(by + Math.sin(angle) * r, ARENA.Y + 60, ARENA.Y + ARENA.H - 60);
      // Conta como pendente já no AGENDAMENTO: o atraso (i*220) também faz
      // parte da janela em que o minion não existe ainda. Sem isso o round
      // podia ser dado como completo antes dos minions nascerem.
      this._pending++;
      this.scene.time.delayedCall(i * 220, () => {
        if (this.scene.isGameOver) { this._pending = Math.max(0, this._pending - 1); return; }
        const type = Math.random() < 0.5 ? 'clown-skinny' : 'clown';
        this._showSpawnMarker(mx, my, false, () => {
          this.enemies.push(new Enemy(this.scene, mx, my, this.round, type));
          this._pending = Math.max(0, this._pending - 1);
        });
      });
    }
  }

  get aliveCount() {
    return this.enemies.filter(e => !e.isDead).length;
  }
}
