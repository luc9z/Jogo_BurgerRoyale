export const GAME  = { WIDTH: 960, HEIGHT: 540 };

export const ARENA = {
  X: 40, Y: 70,
  get W() { return GAME.WIDTH  - this.X * 2; },
  get H() { return GAME.HEIGHT - this.Y - 20; },
};

export const PLAYER = {
  SPEED: 190, MAX_HEALTH: 100, CLIP_SIZE: 10,
  RELOAD_MS: 1800, SHOOT_CD_MS: 280, IFRAME_MS: 700,
  SCALE: 1.3,
};

export const ENEMY = {
  BASE_HP: 80, HP_PER_ROUND: 20,
  BASE_SPEED: 55, SPEED_PER_ROUND: 4, MAX_SPEED: 130,
  POINTS: 100, CONTACT_DPS: 18, HIT_RADIUS: 32,
};

// Tipos de inimigo com multiplicadores de stats
export const ENEMY_TYPES = {
  clown:         { key: 'clown',        scale: 1.2,  hpMult: 1.0, speedMult: 1.0,  pointsMult: 1.0 },
  'clown-fat':   { key: 'clown-fat',    scale: 1.5,  hpMult: 2.0, speedMult: 0.65, pointsMult: 2.0 },
  'clown-skinny':{ key: 'clown-skinny', scale: 0.95, hpMult: 0.6, speedMult: 1.6,  pointsMult: 1.5 },
};

export const BULLET = { SPEED: 520, DAMAGE: 25 };
export const ROUND  = { WARN_MS: 3500, SPAWN_MS: 500, BASE_COUNT: 5, PER_ROUND: 2, MAX_COUNT: 30 };

export const WEAPONS = {
  pistol:     { name: 'PISTOLA',      damage: 25, bulletSpeed: 520, clipSize: 10, shootCd: 280, reloadMs: 1800, spread: 0,    pellets: 1, range: 620  },
  shotgun:    { name: 'ESCOPETA',     damage: 28, bulletSpeed: 420, clipSize: 6,  shootCd: 650, reloadMs: 2000, spread: 0.28, pellets: 5, range: 190  },
  machinegun: { name: 'METRALHADORA', damage: 12, bulletSpeed: 600, clipSize: 30, shootCd: 95,  reloadMs: 1500, spread: 0.08, pellets: 1, range: 500  },
  sniper:     { name: 'SNIPER',       damage: 90, bulletSpeed: 950, clipSize: 3,  shootCd: 900, reloadMs: 2500, spread: 0,    pellets: 1, range: 1400 },
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
