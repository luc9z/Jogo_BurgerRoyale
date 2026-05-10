export const GAME  = { WIDTH: 960, HEIGHT: 540 };

export const ARENA = {
  X: 40, Y: 70,
  get W() { return GAME.WIDTH  - this.X * 2; },
  get H() { return GAME.HEIGHT - this.Y - 20; },
};

export const PLAYER = {
  SPEED: 190, MAX_HEALTH: 100, CLIP_SIZE: 10,
  RELOAD_MS: 1800, SHOOT_CD_MS: 280, IFRAME_MS: 700,
  SCALE: 0.9,
};

export const ENEMY = {
  BASE_HP: 80, HP_PER_ROUND: 20,
  BASE_SPEED: 55, SPEED_PER_ROUND: 4, MAX_SPEED: 130,
  POINTS: 100, CONTACT_DPS: 18, SCALE: 0.85, HIT_RADIUS: 30,
};

export const BULLET  = { SPEED: 520, DAMAGE: 25 };
export const ROUND   = { WARN_MS: 3500, SPAWN_MS: 500, BASE_COUNT: 5, PER_ROUND: 2, MAX_COUNT: 30 };

// Spritesheet: king.png 6 frames FW=112 FH=115 | clown.png 29 frames FW=105 FH=115
export const KING_SHEET  = { FW: 112, FH: 115 };
export const CLOWN_SHEET = { FW: 105, FH: 115 };

// King: 0-1=idle  2-4=walk  5=attack
export const KING_ANIM = {
  IDLE:   { start: 0, end: 1 },
  WALK:   { start: 2, end: 4 },
  ATTACK: { start: 5, end: 5 },
};

// Clown: idle=0-3  walk=4-8  jump=9-12  attack=13-16  taunt=17-20  hurt=21-24  death=25-28
export const CLOWN_ANIM = {
  IDLE:   { start: 0,  end: 3  },
  WALK:   { start: 4,  end: 8  },
  ATTACK: { start: 13, end: 16 },
  HURT:   { start: 21, end: 24 },
  DEATH:  { start: 25, end: 28 },
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

export const EVT = { ENEMY_KILLED: 'enemy-killed', PLAYER_DEAD: 'player-dead' };
