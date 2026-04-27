// ═══════════════════════════════════════════════════════════
//  CONSTANTES — Burger Royale: Clown Apocalypse
// ═══════════════════════════════════════════════════════════

export const GAME = {
  WIDTH:  960,
  HEIGHT: 540,
};

// Arena jogável (dentro da tela)
export const ARENA = {
  X: 40,
  Y: 70,
  get W() { return GAME.WIDTH  - this.X * 2; },
  get H() { return GAME.HEIGHT - this.Y - 20; },
};

// Player
export const PLAYER = {
  SPEED:        190,
  MAX_HEALTH:   100,
  CLIP_SIZE:    10,
  RELOAD_MS:    1800,
  SHOOT_CD_MS:  280,
  IFRAME_MS:    700,
  SCALE:        0.55,
};

// Inimigos
export const ENEMY = {
  BASE_HP:          80,
  HP_PER_ROUND:     20,
  BASE_SPEED:       55,
  SPEED_PER_ROUND:  4,
  MAX_SPEED:        130,
  POINTS:           100,
  CONTACT_DPS:      18,
  SCALE:            0.5,
  HIT_RADIUS:       30,
};

// Balas
export const BULLET = {
  SPEED:   520,
  DAMAGE:  25,
};

// Rounds
export const ROUND = {
  WARN_MS:    3500,
  SPAWN_MS:   500,
  BASE_COUNT: 5,
  PER_ROUND:  2,
  MAX_COUNT:  30,
};

// Spritesheet (grade 7×7, frameW 206, frameH 155)
export const SHEET = {
  FRAME_W: 206,
  FRAME_H: 155,
};

// Índices de frames (idx = row*7 + col, col 0 = label)
export const KING_FRAMES = {
  IDLE:    [1, 2, 3],
  WALK:    [8, 9, 10, 11, 12],
  RUN:     [15, 16, 17, 18, 19],
  ATTACK:  [29, 30, 31, 32, 33],
  HURT:    [36, 37, 38, 39],
};

export const CLOWN_FRAMES = {
  IDLE:   [1, 2, 3, 4],
  WALK:   [8, 9, 10, 11, 12],
  ATTACK: [22, 23, 24, 25, 26, 27],
  HURT:   [36, 37, 38, 39],
  DEATH:  [43, 44, 45, 46, 47, 48],
};

// Cores
export const COLOR = {
  WALL:       0x7a1500,
  WALL_GLOW:  0xff3300,
  GOLD:       0xd4a000,
  GOLD_LIGHT: 0xffd740,
  RED:        0xcc1100,
  GREEN:      0x1fcc3f,
  ORANGE:     0xff8800,
  HUD_BG:     0x0c000f,
  HUD_BORDER: 0x3a1200,
};

// Z-order
export const DEPTH = {
  BG:       0,
  BORDER:   2,
  SHADOW:   3,
  ENTITY:   5,
  BULLET:   6,
  ENEMY_UI: 7,
  FX:       9,
  HUD:      20,
  BANNER:   30,
  OVERLAY:  40,
};

// Eventos
export const EVT = {
  ENEMY_KILLED: 'enemy-killed',
  PLAYER_DEAD:  'player-dead',
};
