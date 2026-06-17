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

export const BULLET = { SPEED: 520, DAMAGE: 25 };
export const ROUND  = { WARN_MS: 3500, SPAWN_MS: 480, BASE_COUNT: 6, PER_ROUND: 3, MAX_COUNT: 50 };

export const WEAPONS = {
  knife:        { name: 'FACA',          damage: 45,  bulletSpeed: 0,    clipSize: -1, shootCd: 420, reloadMs: 0,    spread: 0,    pellets: 0, range: 78,   isMelee: true  },
  pistol:       { name: 'PISTOLA',       damage: 25,  bulletSpeed: 520,  clipSize: 10, shootCd: 280, reloadMs: 1800, spread: 0,    pellets: 1, range: 620,  isMelee: false },
  revolver:     { name: 'REVOLVER',      damage: 78,  bulletSpeed: 700,  clipSize: 6,  shootCd: 490, reloadMs: 1700, spread: 0,    pellets: 1, range: 920,  isMelee: false },
  shotgun:      { name: 'ESCOPETA',      damage: 30,  bulletSpeed: 430,  clipSize: 6,  shootCd: 650, reloadMs: 2000, spread: 0.28, pellets: 5, range: 200,  isMelee: false },
  machinegun:   { name: 'METRALHADORA',  damage: 13,  bulletSpeed: 610,  clipSize: 35, shootCd: 90,  reloadMs: 1400, spread: 0.08, pellets: 1, range: 520,  isMelee: false },
  sniper:       { name: 'SNIPER',        damage: 180, bulletSpeed: 1200, clipSize: 5,  shootCd: 750, reloadMs: 2000, spread: 0,    pellets: 1, range: 1800, isMelee: false },
  burst:        { name: 'BURST',         damage: 38,  bulletSpeed: 750,  clipSize: 21, shootCd: 180, reloadMs: 1500, spread: 0.06, pellets: 3, range: 850,  isMelee: false },
  laser:        { name: 'LASER',         damage: 55,  bulletSpeed: 2200, clipSize: 16, shootCd: 220, reloadMs: 1600, spread: 0,    pellets: 1, range: 2000, isMelee: false },
  doubleshotgun:{ name: 'ESCOPETA DUPLA',damage: 28,  bulletSpeed: 460,  clipSize: 4,  shootCd: 500, reloadMs: 1800, spread: 0.32, pellets: 8, range: 220,  isMelee: false },
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
