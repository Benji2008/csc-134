
# Crypt Crawler — Design Document

**Author:** Hiltibidal
**Course:** CSC 134
**Module:** M8 — Final Project

---

## 1. Concept

A browser-based 2D top-down dungeon crawler inspired by *The Binding of Isaac*. The player moves through five floors. Each floor is a small map of connected rooms, and each floor ends with a boss. Beat the final boss and you win the run — the game records your time, total wins, current win streak, and longest win streak across runs.

The pitch in one sentence: **"Quick runs, satisfying shooting, real progression to brag about."**

## 2. Goals (and non-goals)

### Goals
- **Runs in any modern browser** with no install, no server, no build tools. Open `index.html` and play.
- **Core loop feels good in the first 30 seconds.** Movement must be responsive and shooting must feel impactful.
- **Five distinct floors** with five distinct bosses, each with a different attack pattern.
- **Persistent stats** (total wins, current streak, best streak, best time) that survive refresh via `localStorage`.
- **Readable code** that a classmate could fork and modify (one-purpose files, named constants, no clever one-liners).

### Non-goals (deliberately cut)
- No sprite art / animation frames — geometric shapes with intentional color palettes. Cuts scope and dodges art-asset hell.
- No sound. (Stretch goal if there's time.)
- No save/resume mid-run. A run is a single sitting.
- No NPCs, dialogue, or factions.
- No item shop / currency. Treasure rooms grant one free item; no paid economy.

### Goals added after v1 playtest
After getting the core loop running, two features earned their way in:
- **Random floor layouts** — backbone is still Start → N enemy rooms → Boss with a treasure branch, but N (2–4) and door directions reroll each run. Replaces the original hand-designed plan; pacing held up because the structure is constrained even if the specifics shift.
- **Treasure rooms + 15 items** — picking up an item modifies the player's instance stats (speed, damage, fire pattern, etc.). This is the closest the game gets to "build crafting." Scope held at 15 hand-picked items; no synergies / curses / decay (those were on the table but cut as scope creep).
- **Themed floors** — five distinct palettes themed as a descent through a giant creature (Skin → Stomach → Bloodstream → Lungs → Brain), with per-theme enemy tints and ambient effects (pores, flowing blood cells, alveoli, synapses).

## 3. Player experience target

When the player loads the page, they should:
1. See a title screen with their stats and a clear "Press Space to start" prompt — under 2 seconds.
2. Be moving and shooting within 5 seconds.
3. Hit their first enemy within 10 seconds.
4. Reach the first boss within ~60 seconds on a clean run.
5. Feel a difficulty bump per floor — not just more enemies, but new threats.

## 4. Game systems

### 4.1 Player
- Position (x, y), velocity, radius
- HP measured in half-hearts (start: 6 = 3 full hearts)
- Movement: WASD (or arrow keys). Diagonal movement is normalized so you don't go faster diagonally.
- Shooting: arrow keys to fire in 4 directions. Fire rate is throttled (cooldown ~250ms).
- Invulnerability frames after taking damage (~1 second) so you don't get one-shot by overlapping enemies.

### 4.2 Projectiles
- Player and enemies share the same projectile system, but tagged by side (`'player'` vs `'enemy'`) so friendly fire isn't a thing.
- Projectiles have position, velocity, and a TTL so they don't live forever.

### 4.3 Enemies
A small bestiary, reused across floors with palette / stat tweaks:
- **Walker** — moves slowly toward player, contact damage.
- **Shooter** — stays still, fires aimed shots on a timer.
- **Charger** — pauses, then dashes at the player.
- **Splitter** — when killed, spawns two smaller Walkers.

### 4.4 Bosses
Each floor ends with a boss in a dedicated room. Bosses have ~10x normal HP and a multi-phase attack pattern.

| Floor | Boss          | Gimmick                                           |
|-------|---------------|---------------------------------------------------|
| 1     | The Slime     | Splits in two when health drops below 50%.        |
| 2     | The Sentinel  | Stationary; rotating 8-way bullet spray.          |
| 3     | The Hunter    | Charges the player + leaves damaging trails.      |
| 4     | The Conjurer  | Summons Walkers and Shooters; teleports.          |
| 5     | The Warden    | Two-phase: bullet hell phase, then chase phase.   |

### 4.5 Rooms and floors
- A floor is a graph of rooms. The player enters at a Start room. Doors to neighboring rooms are locked while enemies are alive. Clearing a room unlocks its doors.
- Each room is one screen — no scrolling. Camera is fixed per room.
- Floor layout (per floor, generated each run): 1 start room, 2–4 enemy rooms in a chain, 1 treasure room branching off a random enemy room, 1 boss room. Door directions are randomized.
- Beating a boss spawns a "stairs" object. Touching it advances to the next floor.

### 4.7 Treasure rooms + items
- One treasure room per floor, branching off a random enemy room. Doors are unlocked from the start (no enemies inside).
- A pedestal in the center holds a randomly-selected item. Walking onto it consumes the item and mutates the player's stats / abilities.
- 15 items grouped by intent:
  - **Stat boosts**: Heart Container, Quick Feet, Iron Skin, Sharp Tooth, Rapid Fire, Long Range, Big Bullets, Vampire
  - **Fire patterns**: Twin Shot, Spread Shot, Piercing, Homing Drift, Bouncing
  - **Defensive / utility**: Soul Heart, Shrink Ray
- The same item can't appear twice in one run (tracked on the player). With 5 floors and 15 items, every run picks a different mix.

### 4.6 Stats persistence
Stored in `localStorage` under one JSON key:
```js
{
  wins: number,            // total full clears
  currentStreak: number,   // increments on win, resets to 0 on death
  bestStreak: number,      // max of currentStreak ever seen
  bestTimeMs: number|null  // fastest full clear, in milliseconds
}
```

Data is read on game start (shown on title screen), written on win and on death.

## 5. Game states / screen flow

```
TITLE  ──Space──▶  PLAYING  ──die──▶  GAME_OVER  ──Space──▶  TITLE
                       │
                    win F5
                       ▼
                    VICTORY  ──Space──▶  TITLE
```

`PLAYING` has a sub-state for the active room and active floor. Pause (`P`) freezes the loop and dims the screen.

## 6. Code architecture

Vanilla JS, no modules / bundler — just `<script>` tags in dependency order. Each file owns one concept:

| File              | Responsibility                                                  |
|-------------------|-----------------------------------------------------------------|
| `js/constants.js` | Tunable numbers (speeds, HP, sizes, colors). Single source of truth. |
| `js/storage.js`   | Read / write the stats JSON in localStorage.                    |
| `js/input.js`     | Keyboard state. Other code asks `input.isDown('w')`.            |
| `js/player.js`    | Player class: state, update, draw, takeDamage.                  |
| `js/projectile.js`| Projectile class + shared list.                                 |
| `js/enemy.js`     | Enemy class + the four enemy "AIs" (walker/shooter/charger/splitter). |
| `js/boss.js`      | The five boss types and their phase logic.                      |
| `js/room.js`      | A single room: walls, doors, enemy spawns, draw.                |
| `js/floors.js`    | Hand-designed floor layouts (which rooms, what spawns, which boss). |
| `js/ui.js`        | HUD (hearts, floor #, timer) + title/gameover/victory screens.  |
| `js/game.js`      | Main loop, state machine, glue.                                 |

This is deliberately more files than a project this size *needs*, but it keeps each file under ~200 lines and makes the rubric's "code quality" criterion easy to satisfy.

## 7. Risks and what I'll cut if I'm short on time

- **Risk: bosses end up samey.** Mitigation: write phase logic per boss instead of reusing a generic AI. If I run out of time, bosses 4 and 5 fall back to "tougher Sentinel."
- **Risk: collision math gets buggy.** Mitigation: circles for entities, AABBs for walls/doors. Both are simple and well-known.
- **Risk: scope creep (items, sounds, sprites).** Mitigation: those live in §2 non-goals. Don't touch until the core loop works.

## 8. Testing checklist

Before declaring done, verify by playing:
- [ ] Title screen shows correct stats after a refresh.
- [ ] Movement: no diagonal speed-up, walls block correctly.
- [ ] Shooting: 4 directions, cooldown enforced.
- [ ] Damage: i-frames work; can't be one-shot by an enemy you're standing in.
- [ ] Doors: locked while enemies alive, unlock when room is clear.
- [ ] Each boss reaches its second phase / gimmick.
- [ ] Win: timer stops, victory screen shows time + wins + streaks.
- [ ] Death: streak resets, total stays, screen offers retry.
- [ ] Stats persist across refresh.
- [ ] Pause works.