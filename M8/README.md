# Crypt Crawler

A browser-based 2D dungeon crawler inspired by *The Binding of Isaac*. Final project for CSC 134 (M8).

## How to run

No install, no server, no build tools. Just open `index.html` in any modern browser:

- Double-click `index.html`, **or**
- From a terminal: `xdg-open index.html` / `open index.html` / `start index.html`

If you'd rather serve it locally (which you don't need to):
```
cd M8
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Controls

| Action | Keys |
|---|---|
| Move    | WASD |
| Shoot   | Arrow keys (4 directions) |
| Pause   | P |
| Start / dismiss screens | Space |
| Wipe saved stats (title screen only) | Hold Shift, press R |

## What you do

Five themed floors descending through a giant creature's body — Skin → Stomach → Bloodstream → Lungs → Brain. Each floor has a randomly-generated chain of enemy rooms, an optional treasure room with a free item, and a boss room. Doors stay locked until the room is cleared. Beat the boss → stairs appear → step on them to descend. Beat all five bosses to win the run.

**Treasure rooms** branch off a random enemy room and contain one of 15 items: stat boosts (Quick Feet, Sharp Tooth…), fire-pattern changers (Twin Shot, Spread Shot, Piercing, Homing, Bouncing), and defensive picks (Soul Heart, Shrink Ray). The room layout and item pool reroll every run.

The game saves four stats across browser refreshes:
- Total wins
- Current win streak
- Longest win streak ever
- Best (fastest) full-clear time

## Files

- `DESIGN.md` — design doc (read this first)
- `prompts.md` — AI collaboration log
- `index.html` — entry point
- `css/style.css` — page framing
- `js/` — game source, one concept per file
  - `constants.js` — every tunable number
  - `storage.js` — localStorage stats
  - `input.js` — keyboard state
  - `projectile.js` — bullets
  - `player.js` — the hero
  - `enemy.js` — four enemy AIs
  - `boss.js` — five boss AIs
  - `room.js` — one screen of play
  - `floors.js` — hand-designed floor layouts
  - `ui.js` — HUD and overlay screens
  - `game.js` — main loop and state machine

## Tested in

Chromium-based browsers and Firefox on Linux. No external dependencies, so it should work anywhere with a recent browser.
