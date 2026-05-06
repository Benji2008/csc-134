# prompts.md — Crypt Crawler AI Collaboration Log

This is my running log of how I worked with Claude (Claude Code) on this project — what I asked, what worked, what I changed, and what I learned. The rubric specifically calls out "directing, iterating, questioning, learning," so I'm trying to show all four, not just paste prompts.

---

## Session 1 — Pitch and design

**My ask, in plain English:**
> "I want to make a 2D Binding-of-Isaac-style game for my final. It should run in the browser, have 5 floors with rooms and a boss room each, and after the final boss tell me my time, total wins, current streak, and longest streak. I want a 100% but I also want it to actually be a fun game."

**What I learned:**
The first thing Claude did wasn't write code — it laid out a plan: tech choice (HTML5 Canvas + vanilla JS so no build tools), file structure, scope cuts (no sprite art, no sound, no shop), and a design doc. That was the right move. When I asked it to "just start building," earlier in the semester (M5 / m5t1), I ended up with a half-working pile of stuff. Slowing down at the design step is what fixed that.

**Useful prompt that worked well:**
> "Plan it out first. Tell me what to cut to keep scope small. Then build it."

The "tell me what to cut" part is the magic — without it the AI tries to give you everything, and you end up with a half-finished everything instead of a finished smaller thing.

---

## Session 2 — Architecture

**Question I pushed back on:**
Claude initially suggested ES modules with `import` / `export`. I asked: "will that work if I just open `index.html` from my file system, or do I need a server?" Answer: opening from `file://` blocks ES module imports in some browsers. So we switched to plain `<script>` tags in dependency order. Less fancy, but it actually works on a school laptop with no Node installed.

**Lesson:**
Don't take the first technical answer. Ask "what does this assume about my setup?"

---

## Session 3 — The "feel" of movement

**Bug I caught while playtesting:**
Diagonal movement was faster than cardinal movement. (Classic Pythagoras problem — pressing W+D gives velocity ~1.41 if you don't normalize.) I asked Claude why moving diagonally felt zoomy and it pointed me at the fix: divide both components by sqrt(2) when both are nonzero. Now in `player.js`:

```js
if (dx !== 0 && dy !== 0) {
  const inv = 1 / Math.sqrt(2);
  dx *= inv; dy *= inv;
}
```

**Lesson:**
"Why does X feel weird?" is a way better prompt than "X is broken, fix it." Describing the *feel* gets the model thinking like a designer, not just a debugger.

---

## Session 4 — Bosses, not just bullet sponges

I was about to build all five bosses by giving them the same AI and just scaling HP. Claude pushed back: "If every boss is just a fatter walker, the game is boring by floor 2." So we wrote a different update loop for each:

- **Slime** — hops, splits at half HP.
- **Sentinel** — stationary, rotating bullet ring (8 spokes when bloodied, 6 when fresh).
- **Hunter** — dashes and leaves damaging trails.
- **Conjurer** — teleports + summons enemies.
- **Warden** — two real phases, the second one chases you.

Writing five small AIs felt like more work than one with knobs, but it ended up being faster because each one is simple in isolation.

**Lesson:**
Beware "configurable" code that ends up doing nothing well. Five 30-line bosses beat one 150-line boss with a `kind` switch.

---

## Session 5 — Doors

The first version had me walking through walls because the doors were always open. Then I overcorrected and made the doors solid until the room was clear, but then the player got stuck *outside* the door rectangle. The fix:
- Doors are visual only (drawn red when locked, green when open).
- Walking onto an *open* door rectangle teleports the player to the next room.
- The room walls are drawn AROUND the door rectangle, so locked doors actually block movement implicitly via the walls.

**Useful prompt:**
> "Stop trying to do collision on the door. Just check 'is the player standing on an open door rectangle' once per frame and warp them."

This is a case where the AI was overengineering and I had to direct it.

---

## Session 6 — i-frames

Without invulnerability frames, walking into a Walker drained all 6 HP in about half a second because you collide with it every single frame. Added a 900ms invulnerability window after taking damage, plus a flicker effect so the player can see they're invulnerable. This is one of those things you don't realize you need until you playtest, which is why §3 of the design doc lists "Hit your first enemy within 10 seconds" — the test catches it.

---

## Session 7 — Stats persistence

Tested the localStorage code by:
1. Beating floor 1's boss (manually buffed my damage to make this fast).
2. Refreshing the page.
3. Making sure the title screen still showed `Total wins: 1`.

Then died on purpose to confirm the streak resets but `wins` does not. Then beat the run again and confirmed `bestTimeMs` got updated.

**Useful prompt for cleaning up between tests:**
> "Add a 'wipe stats' shortcut on the title screen for testing — I don't want to keep clearing localStorage by hand."

Result: hold Shift and press R on the title screen.

---

## Session 8 — Things I tried that DIDN'T make it in

- **Procedural floor generation.** I wanted random rooms each run. Got it half working but the layouts were boring (random branches, no pacing). Hand-designing 5 floors took less time than tuning the generator and the result is better. **Cut.**
- **Sound effects.** Added a few `Audio()` plays for shooting and hits. Sounded annoying after 30 seconds. **Cut.** Listed in DESIGN.md as a stretch goal; left it.
- **Items / power-ups.** Would've doubled the scope. Difficulty curve comes from boss design instead. **Cut.**

I'm logging these because the rubric mentions "AI Collaboration: directing, iterating, questioning" — knowing when to *stop* iterating is part of that. Three things I built and threw away is honest.

---

## Session 9 — The doors didn't actually work

I tested the first build in a browser and the doors were completely broken — I could walk up to a green (open) door but nothing happened. Walked into it from every angle. Nothing.

I told Claude: "the doors don't work, fix them." Claude went and traced through it instead of just throwing code at the bug:

> The visual door rectangle straddles the wall — half outside the room, half inside. The "outside" half is in solid wall (where the player can't go) and the "inside" half is only 12 pixels deep. But the player has radius 14 and gets clamped to stay 14 pixels off the wall. So the player's center can never reach the door trigger by ~2 pixels.

The fix was to split the geometry into two methods: `doorRect` (the visual one straddling the wall) and `doorTriggerRect` (a separate zone INSIDE the room that's 36 pixels deep). I also pushed the spawn-on-entry position from 40 pixels in to 70 pixels in, so when you arrive in a new room, you don't immediately step back through the door you came from.

**Lesson:** when something "doesn't work," the AI is way more useful if you describe what you tried. "I walked at the door from every direction" gave Claude the clue that it was a geometry problem, not a missing keybind or a state-machine bug.

I added a sanity check in `node` that asserts the player's reachable position is inside the trigger rect, and that the spawn position is outside it. Tests caught nothing the second time, which is what tests are supposed to do.

---

## Session 10 — Graphics pass

After fixing doors I told Claude "make the graphics better." That's a vague prompt and I got a vague answer back at first ("I could add sprites, particles, screen shake, lighting..."). I narrowed it down by saying: "no new assets, no images. Just better use of shapes and color. Stuff that takes 30 minutes, not 3 hours."

Concrete additions:
- Floor tile dot pattern (subtle, makes the room feel less flat)
- Door archway frames + a lock icon when locked
- A pulsing aura around the stairs object
- Hit flash on enemies and bosses (white tint for ~90ms when damaged)
- Per-enemy detail layer: walker eyes, shooter pulsing core, charger directional spike, splitter crack-down-the-middle
- Player drop shadow + eyes that look in your shooting direction
- Muzzle flash on shoot
- Hit-burst particles when bullets connect

The enemy detail layer is the one I'm proudest of. Before, all four enemy types were just colored circles. Now you can tell at a glance "that's a charger about to dash" because the spike points at you and brightens.

**Lesson:** "make it better" is a bad prompt. "Make it better in 30 minutes, no new assets, focus on readability not flash" is a good prompt.

---

## Session 11 — Theme + treasure rooms + 15 items + random floors

After the graphics pass I asked Claude to brainstorm theming. It came back with eight directions ranging from "different colors per floor" to "rebuild the game as a moving train." I picked option 2 — the giant-creature's-body theme — because it's the only one in the list that's pure re-skinning instead of a redesign. Five themed floors:

- F1 Skin (pores, fleshy reds and pinks)
- F2 Stomach (rising acid bubbles, yellow-greens)
- F3 Bloodstream (cells flowing left-to-right, deep reds)
- F4 Lungs (alveoli clusters, slow blue pulse)
- F5 Brain (drifting synapses, purples)

Bosses got renamed to fit (Slime → Pustule, Sentinel → Acid Sac, Hunter → Clot, Conjurer → Sporeling, Warden → The Mind). HUD now shows `Floor 2/5: Stomach`. Themes also tint enemies — F3 walkers are deep red instead of generic red.

Then I scoped up: I wanted treasure rooms with 15 items, like Isaac. I'd cut "items / power-up shop" in the original DESIGN.md so this required honest scope re-planning, not just bolting things on:

1. **Player needed instance stats.** Originally the player just used `C.PLAYER_SPEED` directly. Items needed to mutate things, so I moved every tunable (max HP, speed, fire cooldown, bullet damage / speed / radius) onto the player instance. The constants now act as defaults instead of runtime values.

2. **15 items, three categories.** Stat boosts (Heart Container, Quick Feet, Iron Skin, Sharp Tooth, Rapid Fire, Long Range, Big Bullets, Vampire), fire-pattern changers (Twin Shot, Spread Shot, Piercing, Homing Drift, Bouncing), and defensive (Soul Heart, Shrink Ray). I deliberately didn't make every item a damage upgrade — variety is the point.

3. **Projectile got new flags** for piercing (don't die on first hit, track which targets were already hit), homing (bend velocity toward nearest enemy/boss), and bouncing (reflect off walls once instead of dying). I added a halo around piercing bullets so the player can see the upgrade is active.

4. **Treasure rooms** are a new room kind branching off a random enemy room. No enemies; doors are unlocked from the start. A pedestal in the center holds the item. Walking onto it consumes the item, sparkles, and pops a toast.

5. **Random floors.** I told Claude "make every floor random" — but I'd cut procedural generation in DESIGN.md after a failed attempt earlier. So we did a *constrained* random: backbone is still Start → N enemy rooms → Boss with a treasure branch, but N (2–4) and door directions reroll each run. Pacing holds because the structure is fixed even when the specifics aren't.

**The biggest scope-management lesson of the project:** when the user wants new features after v1, don't just stack them on top — go back and reconsider what the design doc says is in or out. I had to formally promote items, treasure, and randomization from "cut" to "in scope" and update the doc, otherwise the project starts feeling like duct tape.

---

## Session 12 — What Claude got wrong

- First draft of the Hunter boss had its trail damage checked in the boss's own update loop, not the main game loop. That meant the trail kept damaging the player even after the boss was dead. Caught it in playtesting; refactored to a `getHazards()` method the main loop polls.
- First draft used `setInterval` for the game loop. I pushed for `requestAnimationFrame` so the game pauses correctly when you tab away.
- First draft saved stats every frame. Wasted writes. Now stats only save on win or loss.

**Lesson:**
The AI is fast, not always right. Treat output like a code review, not a delivery.

---

## Quick-reference prompts that worked for me

- **"Tell me what to cut."** — Stops the model from giving you a wishlist.
- **"What does this assume about my setup?"** — Catches problems like ES modules vs `file://`.
- **"Why does X feel weird?"** — Better than "X is broken."
- **"Refactor only what I asked, don't sweep through the file."** — Stops the model from rewriting code that already works.
- **"Add a debug shortcut for this."** — Saves so much manual cleanup during testing.

---

## Final reflection

The thing that surprised me: writing the design doc *first* made the AI collaboration way better. When I had a real spec, I could tell when Claude was drifting off track ("that's not in the goals, skip it") and when its suggestions were valid pushback ("good catch, add it"). Without the doc I'd have just accepted whatever came out.

If I did this again, I'd start with an even simpler version — no streak, no timer, just "can the player walk and shoot?" — and only add features after each playable milestone. I added too much before testing, and had to rip out the procedural generator and the sound system.

## Catgpt help


i used chatgpt for this one "You’re right to avoid just reskinning The Binding of Isaac—a lot of clones fall into that trap. The core loop (procedural rooms, items, runs) is flexible, so the “feel” of your game will come from your theme, mechanics, and progression twist. Here are some directions that keep the spirit but feel fresh:

1. Non-dungeon structure
Instead of a basement, rethink the space itself:

A moving train where each car is a room and the layout shifts mid-run
A sinking island where areas disappear over time
A giant creature’s body (organs as “biomes” with unique rules)
This changes pacing and tension without altering the core loop too much.

2. Cause-and-effect item system
In Isaac, items mostly stack. You could make items interact in unexpected ways:

Combining two weak items creates a powerful mutation
Some items evolve or decay depending on your playstyle
“Cursed synergy” where combos have both upsides and downsides
Think more chemistry than just stat boosts.

3. Time-based mechanics
Add pressure beyond combat:

A day/night cycle affecting enemies and loot
A looming threat that slowly hunts the player (like a creeping fog or entity)
Rewinding time as a limited resource (undo damage vs. lose progress)

4. Social or relationship layer
Instead of being alone:

NPCs that join your run and change gameplay (but can die permanently)
Factions you help or betray, affecting future runs
Dialogue choices that subtly alter item pools or bosses
This adds narrative weight without needing full storytelling.

5. Player-built difficulty
Let the player shape their own run:

Choose modifiers at the start (harder enemies but better loot)
Risk/reward doors—take a dangerous path for rare items
A “corruption meter” where power makes the game harder

6. Combat twist
Change how fighting feels:

Physics-based projectiles (ricochet, gravity, wind)
Melee-focused with positioning instead of bullet spam
Environmental kills (traps, hazards, chain reactions)

7. Memory or meta-progression theme
Make runs connect in a meaningful way:

The world “remembers” your past runs (rooms change, NPCs react)
You’re rebuilding something between runs (town, mind, machine)
Past deaths become ghosts or enemies in future runs

8. Visual + tone shift
Isaac stands out partly because of its disturbing style. You can go a totally different direction:

Cozy but eerie (cute world with unsettling mechanics)
Sci-fi systems simulation (clean UI, abstract enemies)
Hand-drawn surrealism or dream logic"

