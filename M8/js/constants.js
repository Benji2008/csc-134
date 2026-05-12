// constants.js — every tunable number in one place.
// Change these to retune the game without hunting through other files.

const C = {
  // Canvas
  CANVAS_W: 800,
  CANVAS_H: 600,

  // Room (the play area inside the canvas, leaving room for HUD)
  HUD_H: 40,
  ROOM_PAD: 16,            // wall thickness inside the canvas

  // Player — bumped from 14 so the character reads chunkier on screen.
  // BoI's camera sits close; this gets us closer to that scale.
  PLAYER_RADIUS: 20,
  PLAYER_SPEED: 220,       // px / sec
  PLAYER_MAX_HP: 6,        // half-hearts (3 full hearts)
  PLAYER_IFRAMES_MS: 900,
  PLAYER_FIRE_COOLDOWN_MS: 260,
  PLAYER_BULLET_SPEED: 460,
  PLAYER_BULLET_RADIUS: 5,
  PLAYER_BULLET_TTL_MS: 900,
  PLAYER_BULLET_DAMAGE: 1,

  // Enemies (base; subtypes scale these)
  ENEMY_BULLET_SPEED: 240,
  ENEMY_BULLET_RADIUS: 6,
  ENEMY_BULLET_TTL_MS: 2200,

  // Door
  DOOR_W: 60,
  DOOR_H: 24,

  // Floors
  TOTAL_FLOORS: 5,

  // Colors — used everywhere, so named here.
  COLOR_BG: '#0e0c14',
  COLOR_WALL: '#3a3552',
  COLOR_WALL_LINE: '#5a527a',
  COLOR_DOOR_LOCKED: '#5a3a3a',
  COLOR_DOOR_OPEN: '#7ad97a',
  COLOR_PLAYER: '#f0e68c',
  COLOR_PLAYER_IFRAME: '#fffac0',
  COLOR_PLAYER_BULLET: '#fff7c2',
  COLOR_ENEMY_BULLET: '#ff7a6b',
  COLOR_HEART: '#ff5a6f',
  COLOR_HEART_EMPTY: '#3a2a30',
  COLOR_TEXT: '#e6e1d3',
  COLOR_TEXT_DIM: '#8a8499',
  COLOR_STAIRS: '#9adfff',

  // Polish layer
  COLOR_FLOOR_TILE: '#16131f',
  COLOR_FLOOR_DOT:  '#211c2d',
  COLOR_DOOR_FRAME: '#2a2438',
  COLOR_HIT_FLASH:  '#ffffff',
  HIT_FLASH_MS: 90,
};

// Game state constants — strings instead of magic numbers so logs are readable.
const STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameover',
  VICTORY: 'victory',
};

// --- Hand-drawn circle helpers ---------------------------------------------
// BoI's silhouettes look hand-inked: lumps, slightly uneven contours, never
// mathematically perfect. These helpers set up a wobbly path that the caller
// can fill/stroke however they want.
//
// `seed` controls jitter pattern. Pass a stable per-entity seed for a steady
// silhouette, or `seed + Math.floor(performance.now() / 120)` for ~8fps twitch.
function pathWobblyCircle(ctx, x, y, r, seed) {
  const segs = 22;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    // Cheap hash so each "vertex" of the circle is jittered consistently.
    const h = Math.sin((seed + i * 1.7) * 12.9898) * 43758.5453;
    const j = (h - Math.floor(h)) - 0.5;       // -0.5..0.5
    const rr = r + j * Math.max(1.4, r * 0.10); // ~10% wobble, min 1.4px
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Slow time-stepped seed — flips every ~120ms so silhouettes twitch like BoI
// limited-frame animation instead of shimmering at 60fps.
function twitchSeed(baseSeed) {
  return baseSeed + Math.floor(performance.now() / 120);
}

// Draw a BoI-style creature body + two feet beneath a head circle.
// The head is drawn separately by the caller at (x, headY) with radius headR;
// this helper just lays down a small belly lump and two animated feet so the
// character reads as "head + body" instead of a floating sphere.
//
// opts:
//   bodyColor (CSS color) — fill for the belly lump
//   outline    (CSS color) — outline for body + feet (default ink black)
//   moving     (bool)      — if true, feet alternate (walk anim); else planted
//   phase      (number)    — walk-cycle phase, in radians (use entity.walkT or t*10)
//   seed       (number)    — for wobbly body silhouette
//   bodyScale  (number)    — multiplier for body width/height (default 1)
//   footColor  (CSS color) — fill for feet (default a darker ink than outline)
function drawCreatureBody(ctx, x, headY, headR, opts = {}) {
  const bodyColor = opts.bodyColor || '#f0d8b0';
  const outline   = opts.outline   || '#1a0d10';
  const footColor = opts.footColor || '#1a0d10';
  const moving    = !!opts.moving;
  const phase     = opts.phase ?? 0;
  const seed      = opts.seed ?? 0;
  const scale     = opts.bodyScale ?? 1;

  // Torso is narrower than the head (BoI proportion: dominant head, smaller
  // body below) and tall enough that a clear chunk sticks out under the head
  // instead of getting fully eclipsed by it.
  const bodyW = headR * 0.70 * scale;
  const bodyH = headR * 0.80 * scale;
  const bodyY = headY + headR * 0.85;

  // Feet — sit at the very base of the body so they read as legs/shoes
  // poking out below the torso.
  const footY = bodyY + bodyH * 0.90;
  const footR = headR * 0.26;
  const liftL = moving ? Math.max(0, Math.sin(phase)) * footR * 0.9 : 0;
  const liftR = moving ? Math.max(0, -Math.sin(phase)) * footR * 0.9 : 0;
  const footLX = x - bodyW * 0.50;
  const footRX = x + bodyW * 0.50;
  ctx.fillStyle = footColor;
  ctx.beginPath();
  ctx.ellipse(footLX, footY - liftL, footR, footR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(footRX, footY - liftR, footR, footR * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body — small belly ellipse with a tiny per-seed wobble so it doesn't feel
  // geometric.
  const wob = ((Math.sin((seed + 3) * 12.9898) * 43758.5453) % 1) * 0.06;
  ctx.beginPath();
  ctx.ellipse(x, bodyY, bodyW * (1 + wob), bodyH * (1 - wob), 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  // Underbelly shadow.
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 8, 14, 0.32)';
  ctx.fillRect(x - bodyW, bodyY, bodyW * 2, bodyH);
  ctx.restore();
  // Ink outline.
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.4;
  ctx.stroke();
}