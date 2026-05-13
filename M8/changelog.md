# Crypt Crawler — Session Changelog

Notes on what changed in this session, for picking up later.

## Bombs + BoI-feel pass (2026-05-13)

Goal: bombs that punch, screen that reacts, enemies that know they got hit.

- **js/bombs.js** — Bombs are now physical objects. Slide with friction (`vx`,
  `vy`), squash on placement, hard white/red strobe in the final 500ms of fuse,
  three-layer plume on detonation. Added `chainIgnite()` for chain reactions.
  Bumped radius (8→10) and blast (64→72) so they read on screen.
- **js/game.js** —
  - Screen shake (trauma model). Added on bomb explosions (0.7) and on player
    damage (0.35). Decays ~2.4/sec. Translates world layer only; HUD locked.
  - Pushable bombs: a freshly-placed bomb is non-solid until the player steps
    off, then becomes solid and gets kicked when bumped. Constrained to room.
  - `applyBombBlast` rewrite: uses `(R + entity.r)` so edge-of-blast targets
    actually get hit (was missing them), applies outward knockback with
    distance falloff, chain-detonates other bombs in radius, blows the player
    away from their own bomb when caught.
  - Player bullets now knock enemies in the bullet's direction.
- **js/enemy.js** — `knockVx`/`knockVy` velocity field that decays each frame
  (~exp(-9·dt)). `takeDamage(amount, knock)` accepts an optional `{x,y}` to
  add to it. Walker behavior etc. still drives base position; knockback layers
  on top so impacts read even when an enemy is locked to a behavior path.

Known follow-ups:
- Bullet/poop hits don't shake (intentional — only player damage + bombs).
- Boss `takeDamage` ignores the knock arg (huge sprite, no knockback).

## Visual overhaul (BoI-inspired)

Goal: apply `isaac_visual_style.md` and make the game fill the screen.

- **css/style.css** — full rewrite. Canvas now fills the viewport at 4:3 with
  pixelated scaling. Grimy backdrop layers (radial stains + SVG noise grunge)
  and a thick framed border around the play area.
- **js/constants.js** — added `pathWobblyCircle(ctx, x, y, r, seed)` so
  characters/items can draw hand-drawn, uneven outlines instead of clean arcs.
  Also `twitchSeed(base)` for ~8fps stepped wobble.
- **js/player.js** —
  - Permanent tears: drip from one eye every ~0.5–0.9s, fall with gravity, fade.
  - Walk bob while moving; freezes when idle.
  - Wobble outline + pale-flesh body, soft underbelly shadow.
  - Big asymmetric Isaac eyes + tiny frown.
- **js/enemy.js** — wobble outlines that twitch frame-stepped, exaggerated eyes,
  per-kind body-horror details:
  - walker/splitter: big panicked eyes; splitter has a stitched zigzag seam.
  - shooter: single cyclops eye with vertical pupil + drool drip.
  - charger: bony spike + empty eye sockets flanking it.
- **js/boss.js** — wobble outline, heftier drop shadow, single huge cyclops eye
  with restless pupil, gash mouth with rotten teeth on every boss.
- **js/room.js** —
  - Vignette darkening at room edges (before walls).
  - Cracked stone walls: seeded grime stains, zig-zag cracks, brick seams.
  - Stone-framed doors with iron studs + central lock.
  - Persistent blood splat decals (added last session, kept).
  - Per-room static grime spots on the floor.
  - Wobblier treasure pedestal + stairs.
  - Shop pedestal trio drawing (see Shop below).
- **js/ui.js** — grungy HUD bg with baked-in stains, thicker ink-outline lumpy
  hearts, dripping bloody title text, framed stats panel, polished pickup toast,
  redder "YOU DIED" with shadowed type. Added coin + bomb counters next to hearts.
- **js/particles.js** (last session) — `spawnGoreBurst()` for chunky red death
  blood; used on enemy/boss death and bomb explosions via `spawnExplosionParticles`.

## Gameplay expansion

- **js/pickups.js** (new) — `Pickup` class for coins, hearts, and bomb pickups.
  `rollEnemyDrop(x, y, luck)` rolls a drop on enemy death (~30% coin, ~5% bomb,
  ~5% heart, boosted by player.luckBoost).
- **js/bombs.js** (new) — `Bomb` with 1.8s fuse, blinking flash, explosion ring,
  64px blast radius. `spawnExplosionParticles()` for the smoke + embers burst.
- **js/obstacles.js** (new) — `Obstacle` for rocks (indestructible by bullets,
  bomb-only) and poop (3 bullet HP or bombs). `scatterObstaclesInto(room, rocks,
  poops)` for floor generation.
- **js/floors.js** — enemy rooms now scatter 1–3 rocks and 0–2 poops. Added a
  shop branch starting on floor 2 (skipped floor 1 so the player has coins).
- **js/room.js** — Room now holds `obstacles`, `pickups`, `decals`, `shopSlots`.
  Shop rooms render 3 pedestals (heart 3¢, bomb 5¢, random item 15¢) plus a
  "SHOP" sign.
- **js/game.js** — wired everything together:
  - `bombs` array in game state, reset per room.
  - `E` key places a bomb at the player. `Pyromaniac` item boosts blast radius.
  - Player pushed out of obstacles after movement.
  - Player bullets damage poop, are blocked by rocks. Enemy bullets blocked by both.
  - On enemy death: blood splat decal, gore burst, pickup drop roll.
  - On poop death: brown splatter particles.
  - Pickups float toward player if `pickupMagnet` is set.
  - Shop slots auto-buy when player stands on them with enough coins.
  - `Halo` item heals half a heart per room entered.
- **js/items.js** — 12 new items: Cursed Skull, Lucky Foot, Magnet, Big Step,
  Sacred Heart, Cursed Eye, Mystery Pill, Brittle Bones, Wooden Spoon, Halo,
  Pyromaniac, Belt of Holding. Item count is now 27.
- **js/player.js** — new fields: `coins`, `bombs`, `maxBombs`, `luckBoost`,
  `pickupMagnet`, `fastDiagonal`, plus `bombBlastBoost` (Pyromaniac) and
  `haloHeal` set by items.
- **index.html** — added `bombs.js`, `obstacles.js`, `pickups.js` to load order
  (after particles, before player). Hint line mentions `E = bomb`.

## Controls

- WASD = move
- Arrow keys = shoot (4 directions)
- E = place bomb
- P = pause

## Files

New: `js/pickups.js`, `js/bombs.js`, `js/obstacles.js`, `changelog.md`.

## Known follow-ups (not done this session)

- Enemies don't collide with obstacles — only the player does. Adding enemy
  obstacle collision would prevent bosses/chargers from clipping through rocks.
- Bombs don't propagate (a bomb won't ignite another bomb in its blast).
- The "Mystery Pill" can land on the same buff twice in a single run.
- No SFX. Style guide and rubric both fine without it.

# TLDR
● Session wrap-up:

  M8 went from a clean canvas roguelike to a BoI-styled, full-screen one with shop, bombs, pickups, and obstacles. Files now in place:

  - Visual overhaul: CSS scaling, wobble helper, redesigned player/enemies/bosses, cracked walls, vignette, grungy HUD, polished title.
  - New mechanics: pickups.js, bombs.js, obstacles.js, shop room generation, 12 new items (27 total).
  - changelog.md captures everything for next session.

  All JS files pass node --check. Open M8/index.html in a browser — kill an enemy to see coin drops, press E to drop a bomb, walk into the shop pedestals from floor 2 onward.
