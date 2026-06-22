// ═══════════════════════════════════════════════════════════
//  MapBuilder — constrói o cenário
// ═══════════════════════════════════════════════════════════
import { GAME, ARENA, COLOR, DEPTH } from '../constants.js';

const W = GAME.WIDTH;
const H = GAME.HEIGHT;

export function buildMap(scene) {
  // Background do castelo (estica para preencher a tela)
  scene.add.image(W/2, H/2, 'background')
    .setDisplaySize(W, H)
    .setDepth(DEPTH.BG);

  // Overlay para escurecer levemente e dar contraste
  scene.add.rectangle(W/2, H/2, W, H, 0x000000, 0.38)
    .setDepth(DEPTH.BG + 1);

  // Bounds do mundo físico = arena jogável
  scene.physics.world.setBounds(
    ARENA.X, ARENA.Y, ARENA.W, ARENA.H,
  );

  // Borda decorativa
  const g = scene.add.graphics().setDepth(DEPTH.BORDER);
  g.lineStyle(4, COLOR.WALL, 0.9);
  g.strokeRect(ARENA.X, ARENA.Y, ARENA.W, ARENA.H);
  g.lineStyle(1, COLOR.GOLD, 0.4);
  g.strokeRect(ARENA.X + 4, ARENA.Y + 4, ARENA.W - 8, ARENA.H - 8);

  // Cantos dourados
  g.lineStyle(3, COLOR.GOLD_LIGHT, 1);
  const cs = [
    [ARENA.X,           ARENA.Y,            1,  1],
    [ARENA.X + ARENA.W, ARENA.Y,           -1,  1],
    [ARENA.X,           ARENA.Y + ARENA.H,  1, -1],
    [ARENA.X + ARENA.W, ARENA.Y + ARENA.H, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of cs) {
    g.lineBetween(cx, cy, cx + dx*22, cy);
    g.lineBetween(cx, cy, cx, cy + dy*22);
    g.fillStyle(COLOR.GOLD_LIGHT, 1);
    g.fillRect(cx-3, cy-3, 6, 6);
  }
}
