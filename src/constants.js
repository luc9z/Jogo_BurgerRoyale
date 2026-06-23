export const GAME  = { WIDTH: 960, HEIGHT: 540 };

export const ARENA = {
  X: 40, Y: 70,
  get W() { return GAME.WIDTH  - this.X * 2; },
  get H() { return GAME.HEIGHT - this.Y - 20; },
};

// SVG carregado em 180px de altura → scale 0.65 = 117px exibido (mesmo visual, 2x resolução)
export const SVG_H = 180;

export const PLAYER = {
  SPEED: 190, MAX_HEARTS: 3, CLIP_SIZE: 10,
  IFRAME_MS: 950,
  SCALE: 0.65,
};

export const ENEMY = {
  BASE_HP: 70, HP_PER_ROUND: 35,
  BASE_SPEED: 75, SPEED_PER_ROUND: 9, MAX_SPEED: 195,
  POINTS: 100, CONTACT_HEARTS: 1, HIT_RADIUS: 32,
};

// Escalas baseadas em SVG de 180px altura (metade das escalas antigas)
export const ENEMY_TYPES = {
  clown:         { key: 'clown',        scale: 0.60,  hpMult: 1.0,  speedMult: 1.0,  pointsMult: 1.0  },
  'clown-fat':   { key: 'clown-fat',    scale: 0.75,  hpMult: 2.2,  speedMult: 0.62, pointsMult: 2.5  },
  'clown-skinny':{ key: 'clown-skinny', scale: 0.475, hpMult: 0.55, speedMult: 1.75, pointsMult: 1.8  },
  'clown-boss':  { key: 'clown-fat',    scale: 1.65,  hpMult: 9.0,  speedMult: 0.42, pointsMult: 14.0 },
};

// Campanha tem 5 fases (rounds). Limpar a fase 5 = vitória.
export const MAX_LEVELS = 5;

export const BULLET = { SPEED: 520, DAMAGE: 25 };
export const ROUND  = { WARN_MS: 3500, SPAWN_MS: 480, BASE_COUNT: 6, PER_ROUND: 3, MAX_COUNT: 50 };

// tier = posição na escada de evolução. Upgrades só oferecem armas de tier
// MAIOR que a equipada — nunca repete nem rebaixa (pistola→revólver→...→laser).
export const WEAPONS = {
  pistol:       { name: 'PISTOLA',        tier: 0, damage: 26,  bulletSpeed: 560,  clipSize: 12, shootCd: 260, reloadMs: 1500, spread: 0,    pellets: 1, range: 640,  isMelee: false },
  revolver:     { name: 'REVÓLVER',       tier: 1, damage: 62,  bulletSpeed: 760,  clipSize: 6,  shootCd: 340, reloadMs: 1500, spread: 0.01, pellets: 1, range: 920,  isMelee: false },
  shotgun:      { name: 'ESCOPETA',       tier: 2, damage: 24,  bulletSpeed: 480,  clipSize: 7,  shootCd: 600, reloadMs: 1900, spread: 0.30, pellets: 6, range: 240,  isMelee: false },
  burst:        { name: 'BURST',          tier: 3, damage: 30,  bulletSpeed: 780,  clipSize: 24, shootCd: 240, reloadMs: 1400, spread: 0.05, pellets: 3, range: 860,  isMelee: false },
  machinegun:   { name: 'METRALHADORA',   tier: 4, damage: 16,  bulletSpeed: 640,  clipSize: 40, shootCd: 80,  reloadMs: 1500, spread: 0.10, pellets: 1, range: 580,  isMelee: false },
  sniper:       { name: 'SNIPER',         tier: 5, damage: 210, bulletSpeed: 1300, clipSize: 5,  shootCd: 700, reloadMs: 1900, spread: 0,    pellets: 1, range: 1900, isMelee: false },
  doubleshotgun:{ name: 'ESCOPETA DUPLA', tier: 6, damage: 26,  bulletSpeed: 500,  clipSize: 8,  shootCd: 480, reloadMs: 1900, spread: 0.34, pellets: 8, range: 250,  isMelee: false },
  laser:        { name: 'LASER',          tier: 7, damage: 72,  bulletSpeed: 2400, clipSize: 18, shootCd: 200, reloadMs: 1500, spread: 0,    pellets: 1, range: 2000, isMelee: false },
};

export const MYSTERY_BOX = { COST: 500, INTERACT_DIST: 60 };

// Todos os spritesheets são 500×500 → grid 5×5 = frame 100×100 = 25 frames (0-24)
export const SHEET = { FW: 100, FH: 100, COLS: 5 };

// Linha 0 (frames 0-4):   idle
// Linha 1 (frames 5-9):   walk
// Linha 2 (frames 10-14): attack / shoot
// Linha 3 (frames 15-19): hurt
// Linha 4 (frames 20-24): death

export const KING_FRAMES = {
  IDLE:   [0, 1, 2, 3],
  WALK:   [5, 6, 7, 8, 9],
  ATTACK: [10, 11, 12, 13, 14],
  HURT:   [15, 16],
  DEATH:  [20, 21, 22, 23],
};

export const CLOWN_FRAMES = {
  IDLE:   [0, 1, 2],
  WALK:   [5, 6, 7, 8, 9],
  ATTACK: [10, 11, 12, 13, 14],
  HURT:   [15, 16],
  DEATH:  [20, 21, 22, 23],
};

export const COLOR = {
  WALL: 0x7a1500, WALL_GLOW: 0xff3300,
  GOLD: 0xd4a000, GOLD_LIGHT: 0xffd740,
  RED: 0xcc1100, GREEN: 0x1fcc3f, ORANGE: 0xff8800,
  HUD_BG: 0x0c000f, HUD_BORDER: 0x3a1200,
};

export const DEPTH = {
  BG: 0, BORDER: 2, SHADOW: 3,
  ENTITY: 5, BULLET: 6, ENEMY_UI: 7,
  FX: 9, HUD: 20, BANNER: 30, OVERLAY: 40,
};

export const EVT = { ENEMY_KILLED: 'enemy-killed', PLAYER_DEAD: 'player-dead', WEAPON_CHANGED: 'weapon-changed' };
