// game.js — main loop and state machine.
// Holds the canvas + ctx, transitions between TITLE / PLAYING / PAUSED /
// GAME_OVER / VICTORY, and during PLAYING runs the world update + render.

const Game = (function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // --- Persistent stats and ephemeral run state -----------------------------
  let stats = Storage.load();

  let state = STATE.TITLE;
  let player = null;
  let floorIdx = 0;
  let floor = null;          // current floor object
  let currentRoom = null;    // reference into floor.rooms
  let projectiles = [];
  let particles = [];
  let enemies = [];
  let boss = null;
  let bossDefeated = false;  // for current floor; resets each floor
  let bombs = [];            // active placed bombs; reset per room
  let runTimeMs = 0;         // accumulated playing time; freezes during pause
  let lastVictoryWasBest = false;
  // Track bosses already used this run so pickBossForFloor can avoid repeats.
  let usedBosses = [];
  // Pickup toast — shown briefly when the player grabs an item.
  let pickupToast = { text: '', ttl: 0 };
  function showPickupToast(text) { pickupToast.text = text; pickupToast.ttl = 2800; }

  // Screen-shake: trauma model. Add() bumps trauma; render() converts trauma^2
  // into a random pixel offset. Decays each frame. Punches up bombs and big hits
  // without wrecking aim.
  let shakeTrauma = 0;
  function addShake(amount) { shakeTrauma = Math.min(1, shakeTrauma + amount); }

  // Hit pause: freeze the simulation for a few frames on impact. dt is forced
  // to 0 while hitPauseMs > 0, which gives every solid hit a satisfying punch.
  // Use max() so overlapping triggers don't stack — longest wins.
  let hitPauseMs = 0;
  function addHitPause(ms) { hitPauseMs = Math.max(hitPauseMs, ms); }

  // Selected character — set by the character-select screen, consumed by startRun.
  let selectedCharIdx = 0;

  // --- Run lifecycle --------------------------------------------------------
  function startRun() {
    const ch = CHARACTERS[selectedCharIdx] || CHARACTERS[0];
    player = new Player(C.CANVAS_W / 2, C.CANVAS_H / 2, ch);
    floorIdx = 0;
    usedBosses = [];
    enterFloor(0);
    runTimeMs = 0;
    state = STATE.PLAYING;
  }

  function enterFloor(idx) {
    floorIdx = idx;
    const bossKind = pickBossForFloor(idx, usedBosses);
    usedBosses.push(bossKind);
    floor = buildFloor(idx, bossKind);
    bossDefeated = false;
    // Stock the treasure room with a random unseen item.
    const treas = floor.rooms.find(r => r.kind === 'treasure');
    if (treas) {
      const pickedSoFar = player ? player.items : [];
      treas.itemId = pickRandomItem(pickedSoFar).id;
      treas.itemTaken = false;
    }
    enterRoom(floor.startId, null);
  }

  // Move the player into a room. `fromDir` is which direction we entered from
  // (so we can place the player just inside that door).
  function enterRoom(roomId, fromDir) {
    currentRoom = floor.rooms[roomId];
    currentRoom.visited = true;
    projectiles = [];
    particles = [];
    enemies = [];
    boss = null;
    bombs = [];

    // Spawn enemies / boss for this room — only if not already cleared.
    if (!currentRoom.cleared) {
      for (const s of currentRoom.enemySpawns) {
        enemies.push(makeEnemy(s.kind, s.x, s.y, floorIdx));
      }
      if (currentRoom.bossKind) {
        const cx = (currentRoom.left + currentRoom.right) / 2;
        const cy = (currentRoom.top + currentRoom.bottom) / 2;
        boss = makeBoss(currentRoom.bossKind, cx, cy);
      }
    }

    // Place the player.
    const pos = currentRoom.spawnPosForEntry(fromDir);
    player.x = pos.x;
    player.y = pos.y;

    // Halo: heal a tiny bit on entering a new room.
    if (player.haloHeal) player.heal(1);
  }

  // Used by Conjurer / Slime split to inject new enemies mid-room.
  function spawnEnemy(e) { enemies.push(e); }

  // --- Per-frame update ------------------------------------------------------
  function update(dt) {
    // Accumulate playing time. Doing it this way (instead of wall-clock minus
    // start) means PAUSED naturally freezes the timer, since update() doesn't
    // run while paused.
    runTimeMs += dt * 1000;

    // 1. Update player.
    player.update(dt, currentRoom, projectiles);
    pushPlayerOutOfObstacles();

    // Bomb input — press E to drop one if you have any.
    if (Input.wasPressed('e') && player.bombs > 0) {
      const b = new Bomb(player.x, player.y);
      if (player.bombBlastBoost) {
        b.blastR = Math.round(b.blastR * player.bombBlastBoost);
        b.blastDamage = Math.round(b.blastDamage * player.bombBlastBoost);
      }
      bombs.push(b);
      player.bombs -= 1;
    }

    // 2. Update enemies / boss. They may push new projectiles.
    // Skip dead bosses so their attack patterns don't keep firing post-death.
    for (const e of enemies) e.update(dt, currentRoom, player, projectiles, spawnEnemy);
    if (boss && !boss.dead) boss.update(dt, currentRoom, player, projectiles, spawnEnemy);

    // 2b. Update bombs — fuse, explosion, blast resolution.
    //     Loop with index since chain detonations may queue new explosions
    //     mid-iteration (chainIgnite shortens fuses, then they explode here).
    for (let i = 0; i < bombs.length; i++) {
      const b = bombs[i];
      const wasExploded = b.exploded;
      b.update(dt);
      if (!wasExploded && b.exploded) {
        applyBombBlast(b);
      }
    }
    // Keep bombs inside the room (they slide when kicked).
    for (const b of bombs) {
      if (b.exploded) continue;
      if (b.x < currentRoom.left + b.r)   { b.x = currentRoom.left + b.r;   b.vx = 0; }
      if (b.x > currentRoom.right - b.r)  { b.x = currentRoom.right - b.r;  b.vx = 0; }
      if (b.y < currentRoom.top + b.r)    { b.y = currentRoom.top + b.r;    b.vy = 0; }
      if (b.y > currentRoom.bottom - b.r) { b.y = currentRoom.bottom - b.r; b.vy = 0; }
    }
    // Player vs. bomb: a fresh bomb is non-solid until the player steps off.
    // After that, contact kicks the bomb away (BoI-style punt) and the player
    // can't walk through it.
    for (const b of bombs) {
      if (b.exploded) continue;
      const dx = player.x - b.x, dy = player.y - b.y;
      const min = player.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 > min * min) {
        if (!b.solid) b.solid = true;
        continue;
      }
      if (!b.solid) continue; // pass through bombs we just dropped
      const d = Math.sqrt(d2) || 0.0001;
      const nx = dx / d, ny = dy / d;
      // Shove bomb away, push player just outside contact.
      const kick = 220;
      b.vx -= nx * kick * dt * 8;
      b.vy -= ny * kick * dt * 8;
      player.x = b.x + nx * min;
      player.y = b.y + ny * min;
    }
    bombs = bombs.filter(b => !b.dead);

    // 2c. Update obstacles (just hit-flash timers).
    if (currentRoom.obstacles) {
      for (const o of currentRoom.obstacles) o.update(dt);
    }

    // 2d. Update pickups (bobbing + magnet flight).
    if (currentRoom.pickups) {
      for (const pk of currentRoom.pickups) {
        pk.update(dt);
        if (player.pickupMagnet) {
          const dx = player.x - pk.x, dy = player.y - pk.y;
          const d = Math.hypot(dx, dy);
          if (d < 120 && d > 0.1) {
            const pull = 280;
            pk.x += (dx / d) * pull * dt;
            pk.y += (dy / d) * pull * dt;
          }
        }
      }
    }

    // 3. Update projectiles. Homing bullets need the enemy/boss list to find
    //    a target, so we pass them in.
    for (const p of projectiles) p.update(dt, currentRoom, enemies, boss);

    // 3b. Projectiles vs obstacles: rocks block bullets (or bounce them).
    //     Poop takes damage from player bullets and dies after a few hits.
    if (currentRoom.obstacles) {
      for (const p of projectiles) {
        if (p.dead) continue;
        for (const o of currentRoom.obstacles) {
          if (o.dead) continue;
          const dx = p.x - o.x, dy = p.y - o.y;
          if (dx * dx + dy * dy <= (p.r + o.r) * (p.r + o.r)) {
            if (o.kind === 'poop' && p.side === 'player') {
              o.takeDamage(p.damage);
              spawnHitBurst(particles, p.x, p.y, '#5a3a1a');
            }
            p.dead = true;
            break;
          }
        }
      }
    }

    // 4. Collision: player bullets vs enemies / boss. Piercing bullets keep
    //    going (won't hit the same target twice). Each hit shoves the enemy
    //    in the bullet's direction — chunky impact feel without numbers.
    for (const p of projectiles) {
      if (p.dead || p.side !== 'player') continue;
      const bulletSpd = Math.hypot(p.vx, p.vy) || 1;
      const knockScale = 110 / bulletSpd;
      for (const e of enemies) {
        if (e.dead) continue;
        if (p.alreadyHit.has(e)) continue;
        if (circlesHit(p, e)) {
          e.takeDamage(p.damage, { x: p.vx * knockScale, y: p.vy * knockScale });
          spawnHitBurst(particles, p.x, p.y, '#fff7c2');
          if (p.onHit(e)) { p.dead = true; break; }
        }
      }
      if (!p.dead && boss && !boss.dead && !p.alreadyHit.has(boss) && circlesHit(p, boss)) {
        boss.takeDamage(p.damage);
        spawnHitBurst(particles, p.x, p.y, '#ffd87a');
        addHitPause(20);
        if (p.onHit(boss)) p.dead = true;
      }
    }

    // 5. Collision: enemy bullets vs player.
    for (const p of projectiles) {
      if (p.dead || p.side !== 'enemy') continue;
      if (circlesHit(p, player)) {
        if (player.takeDamage(p.damage)) {
          p.dead = true;
          spawnHitBurst(particles, p.x, p.y, '#ff7a6b');
          addShake(0.35);
          addHitPause(70);
        }
      }
    }

    // Particles update / cleanup.
    for (const pa of particles) pa.update(dt);
    particles = particles.filter(pa => !pa.dead);

    // 6. Contact damage from enemies / boss touching the player.
    for (const e of enemies) {
      if (e.dead) continue;
      if (circlesHit(e, player)) {
        if (player.takeDamage(e.contactDamage)) { addShake(0.35); addHitPause(60); }
      }
    }
    if (boss && !boss.dead && circlesHit(boss, player)) {
      if (player.takeDamage(boss.contactDamage)) { addShake(0.45); addHitPause(80); }
    }

    // 7. Hunter trail damage (and any future hazards). Skip if boss is dead so
    // lingering trail blobs don't keep hitting the player after the kill.
    if (boss && !boss.dead && boss.getHazards) {
      for (const h of boss.getHazards()) {
        if (circlesHit(h, player)) {
          if (player.takeDamage(h.damage)) { addShake(0.30); addHitPause(50); }
        }
      }
    }

    // 8. Resolve enemy deaths (handle splitter spawns + Vampire heal).
    const survivors = [];
    for (const e of enemies) {
      if (e.dead) {
        // Tiny pause on each kill so they feel weighty.
        addHitPause(30);
        // Leave a persistent splat + a chunky gore burst at the death spot.
        currentRoom.addBloodSplat(e.x, e.y);
        spawnGoreBurst(particles, e.x, e.y);
        // Roll a pickup drop (coin / heart / bomb / pill / etc.).
        const drop = rollEnemyDrop(e.x, e.y, player.luckBoost || 1.0);
        if (drop) {
          if (!currentRoom.pickups) currentRoom.pickups = [];
          currentRoom.pickups.push(drop);
        }
        // Champion enemies always drop their signature pickup on top of the roll.
        if (e.champion) {
          if (!currentRoom.pickups) currentRoom.pickups = [];
          // Slight offset so the guaranteed drop doesn't sit exactly under the roll.
          currentRoom.pickups.push(championDrop(e.champion, e.x + 12, e.y + 6));
        }
        player.onEnemyKilled();
        for (const newE of e.onDeath()) survivors.push(newE);
      } else {
        survivors.push(e);
      }
    }
    enemies = survivors;

    // 8c. Resolve obstacle deaths — poop sprays floor decals.
    if (currentRoom.obstacles) {
      const obstSurv = [];
      for (const o of currentRoom.obstacles) {
        if (o.dead) {
          if (o.kind === 'poop') {
            // Brown splatter on the floor.
            for (let k = 0; k < 14; k++) {
              const a = Math.random() * Math.PI * 2;
              const sp = 90 + Math.random() * 180;
              particles.push(new Particle(o.x, o.y, Math.cos(a) * sp, Math.sin(a) * sp,
                '#5a3a1a', 360 + Math.random() * 300, 3 + Math.random() * 4));
            }
          }
        } else {
          obstSurv.push(o);
        }
      }
      currentRoom.obstacles = obstSurv;
    }

    // 8d. Pickups vs player.
    if (currentRoom.pickups) {
      const pkSurv = [];
      for (const pk of currentRoom.pickups) {
        if (circlesHit(pk, player)) {
          if (pk.applyTo(player)) {
            // Surface the pill result so the player knows what they got.
            if (pk.kind === 'pill' && pk.pillMessage) showPickupToast('Pill: ' + pk.pillMessage);
            continue;
          }
        }
        pkSurv.push(pk);
      }
      currentRoom.pickups = pkSurv;
    }

    // 8b. Resolve boss death — bigger splat, fatter gore, BoI-style rewards.
    if (boss && boss.dead && !boss._gored) {
      currentRoom.addBloodSplat(boss.x, boss.y, { big: true });
      spawnGoreBurst(particles, boss.x, boss.y, { big: true });
      // Bosses always drop a free heart pickup, often a coin or two, and a
      // random unseen item on a pedestal where they fell. Offset the pedestal
      // slightly off-center so it doesn't fight the stairs for the spot.
      if (!currentRoom.pickups) currentRoom.pickups = [];
      currentRoom.pickups.push(new Pickup(boss.x - 36, boss.y + 30, 'heart'));
      // 50% chance for a soul heart on top.
      if (Math.random() < 0.5) {
        currentRoom.pickups.push(new Pickup(boss.x + 36, boss.y + 30, 'soulheart'));
      }
      // Always sprinkle a couple of coins for flavor.
      for (let i = 0; i < 3; i++) {
        const ang = Math.random() * Math.PI * 2;
        const d = 28 + Math.random() * 22;
        currentRoom.pickups.push(new Pickup(boss.x + Math.cos(ang) * d, boss.y + Math.sin(ang) * d, 'coin'));
      }
      // Reward item pedestal — pick something the player hasn't seen this run.
      const reward = pickRandomItem(player.items);
      currentRoom.itemId = reward.id;
      currentRoom.itemTaken = false;
      // Sit the pedestal a bit above the center stairs so player walks
      // through the reward on the way to descending.
      const roomCx = (currentRoom.left + currentRoom.right) / 2;
      const roomCy = (currentRoom.top + currentRoom.bottom) / 2;
      currentRoom.itemPedestalX = roomCx;
      currentRoom.itemPedestalY = roomCy - 70;
      boss._gored = true;
    }

    // 9. Resolve projectile deaths.
    projectiles = projectiles.filter(p => !p.dead);

    // 10. Room clear: enemies + boss gone -> open doors.
    if (!currentRoom.cleared) {
      const enemiesGone = enemies.length === 0;
      const bossGone = !boss || boss.dead;
      if (enemiesGone && bossGone) {
        currentRoom.openDoors();
        if (boss && boss.dead) bossDefeated = true;
      }
    }

    // 11. Door traversal — walk into an open door to enter next room.
    handleDoors();

    // 11.5 Item pickup: if the player walks onto a pedestal, apply the item.
    //      Works for treasure rooms AND post-boss reward pedestals (any room
    //      with itemId set). itemPedestalX/Y override the default room center.
    if (!currentRoom.itemTaken && currentRoom.itemId) {
      const cx = currentRoom.itemPedestalX ?? (currentRoom.left + currentRoom.right) / 2;
      const cy = (currentRoom.itemPedestalY ?? (currentRoom.top + currentRoom.bottom) / 2) - 14;
      if (Math.hypot(player.x - cx, player.y - cy) < player.r + 14) {
        const item = findItemById(currentRoom.itemId);
        item.apply(player);
        player.items.push(item.id);
        currentRoom.itemTaken = true;
        showPickupToast(item.name + ' — ' + item.desc);
        // Sparkle particles for feedback.
        for (let i = 0; i < 14; i++) {
          spawnHitBurst(particles, cx, cy, item.color);
        }
      }
    }

    // 11.6 Shop interaction — auto-buy when standing on a pedestal with coins.
    if (currentRoom.kind === 'shop' && currentRoom.shopSlots) {
      for (const slot of currentRoom.shopSlots) {
        if (slot.taken) continue;
        if (Math.hypot(player.x - slot.x, player.y - (slot.y - 14)) > player.r + 14) continue;
        if (player.coins < slot.cost) {
          // Visual ping so player knows it's locked behind cash.
          showPickupToast(`Need ${slot.cost}¢ — you have ${player.coins}¢`);
          continue;
        }
        player.coins -= slot.cost;
        slot.taken = true;
        if (slot.kind === 'heart') {
          player.heal(2);
          showPickupToast('Bought: +1 heart');
        } else if (slot.kind === 'bomb') {
          player.bombs = Math.min(player.maxBombs, player.bombs + 1);
          showPickupToast('Bought: +1 bomb');
        } else if (slot.kind === 'key') {
          player.keys = Math.min(player.maxKeys, player.keys + 1);
          showPickupToast('Bought: +1 key');
        } else if (slot.kind === 'item') {
          const item = findItemById(slot.itemId);
          if (item) {
            item.apply(player);
            player.items.push(item.id);
            showPickupToast('Bought: ' + item.name + ' — ' + item.desc);
            for (let i = 0; i < 14; i++) {
              spawnHitBurst(particles, slot.x, slot.y - 14, item.color);
            }
          }
        }
      }
    }

    // 12. Boss-room stairs: stand on the stairs to advance.
    if (currentRoom.kind === 'boss' && bossDefeated) {
      const cx = (currentRoom.left + currentRoom.right) / 2;
      const cy = (currentRoom.top + currentRoom.bottom) / 2;
      if (Math.hypot(player.x - cx, player.y - cy) < 26) {
        if (floorIdx + 1 >= C.TOTAL_FLOORS) {
          finishWin();
        } else {
          enterFloor(floorIdx + 1);
        }
      }
    }

    // 13. Death.
    if (player.isDead()) {
      finishLoss();
    }
  }

  function handleDoors() {
    for (const dir in currentRoom.doors) {
      const door = currentRoom.doors[dir];
      if (!door.opened) continue;
      // Use the trigger rect (inside the room), not the visual rect (on the wall).
      const r = currentRoom.doorTriggerRect(dir);
      if (!rectContains(r, player.x, player.y)) continue;
      // Locked? Consume a key to unlock, then walk through immediately.
      // If no key, just toast and block this frame.
      if (door.locked) {
        if (player.keys <= 0) {
          showPickupToast('Locked — find a key');
          return;
        }
        player.keys -= 1;
        door.locked = false;
        // Mirror the unlock on the matching door in the target room so the
        // return trip is also free.
        const target = floor.rooms[door.target];
        if (target) {
          for (const d2 in target.doors) {
            if (target.doors[d2].target === currentRoom.id) {
              target.doors[d2].locked = false;
            }
          }
        }
      }
      enterRoom(door.target, oppositeDir(dir));
      return;
    }
  }

  // --- End conditions --------------------------------------------------------
  function finishWin() {
    const finalTime = runTimeMs;
    const prevBest = stats.bestTimeMs;
    Storage.recordWin(stats, finalTime);
    lastVictoryWasBest = (prevBest == null || finalTime <= prevBest);
    state = STATE.VICTORY;
  }

  function finishLoss() {
    Storage.recordLoss(stats);
    state = STATE.GAME_OVER;
  }

  // --- Render ---------------------------------------------------------------
  function render() {
    // Clear the whole canvas — HUD area gets repainted by drawHUD.
    ctx.fillStyle = C.COLOR_BG;
    ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);

    if (state === STATE.PLAYING || state === STATE.PAUSED) {
      // Trauma^2 mapping gives big hits a satisfying punch while small hits
      // stay subtle. Translate the world layer only; HUD stays locked.
      const shakeMag = shakeTrauma * shakeTrauma * 14;
      const shakeX = (Math.random() * 2 - 1) * shakeMag;
      const shakeY = (Math.random() * 2 - 1) * shakeMag;
      ctx.save();
      ctx.translate(shakeX, shakeY);
      currentRoom.draw(ctx, currentRoom.kind === 'boss' && bossDefeated, getTheme(floorIdx));
      // Obstacles, pickups in floor layer (below characters).
      if (currentRoom.obstacles) for (const o of currentRoom.obstacles) o.draw(ctx);
      if (currentRoom.pickups)   for (const pk of currentRoom.pickups)  pk.draw(ctx);
      for (const e of enemies) e.draw(ctx);
      if (boss && !boss.dead) boss.draw(ctx);
      player.draw(ctx);
      for (const b of bombs) b.draw(ctx);
      for (const p of projectiles) p.draw(ctx);
      for (const pa of particles) pa.draw(ctx);
      ctx.restore();

      UI.drawHUD(ctx, player, floorIdx, runTimeMs);
      UI.drawMinimap(ctx, floor, currentRoom);
      if (boss && !boss.dead) UI.drawBossBar(ctx, boss);
      if (pickupToast.ttl > 0) {
        UI.drawPickupToast(ctx, pickupToast.text, pickupToast.ttl);
        if (state === STATE.PLAYING) pickupToast.ttl -= 16; // approx ms/frame
      }
      if (state === STATE.PAUSED) UI.drawPause(ctx);

      // Decay trauma toward 0 (only while actually playing).
      if (state === STATE.PLAYING) {
        shakeTrauma = Math.max(0, shakeTrauma - 0.04);
      }
    } else if (state === STATE.TITLE) {
      UI.drawTitle(ctx, stats);
    } else if (state === STATE.CHARACTER_SELECT) {
      UI.drawCharacterSelect(ctx, CHARACTERS, selectedCharIdx);
    } else if (state === STATE.GAME_OVER) {
      UI.drawGameOver(ctx, stats, floorIdx);
    } else if (state === STATE.VICTORY) {
      UI.drawVictory(ctx, stats, runTimeMs, lastVictoryWasBest);
    }
  }

  // --- State input handling --------------------------------------------------
  function handleStateInput() {
    if (state === STATE.TITLE) {
      // SPACE goes to character select instead of straight into a run.
      if (Input.wasPressed(' ')) state = STATE.CHARACTER_SELECT;
      // Wipe stats with Shift+R on the title screen — useful for testing.
      if (Input.isDown('shift') && Input.wasPressed('r')) {
        stats = Storage.fresh();
        Storage.save(stats);
      }
    } else if (state === STATE.CHARACTER_SELECT) {
      if (Input.wasPressed('a') || Input.wasPressed('arrowleft')) {
        selectedCharIdx = (selectedCharIdx - 1 + CHARACTERS.length) % CHARACTERS.length;
      }
      if (Input.wasPressed('d') || Input.wasPressed('arrowright')) {
        selectedCharIdx = (selectedCharIdx + 1) % CHARACTERS.length;
      }
      if (Input.wasPressed(' ')) startRun();
      if (Input.wasPressed('escape')) state = STATE.TITLE;
    } else if (state === STATE.PLAYING) {
      if (Input.wasPressed('p')) state = STATE.PAUSED;
    } else if (state === STATE.PAUSED) {
      if (Input.wasPressed('p')) state = STATE.PLAYING;
    } else if (state === STATE.GAME_OVER || state === STATE.VICTORY) {
      if (Input.wasPressed(' ')) state = STATE.TITLE;
    }
  }

  // --- Collision helpers -----------------------------------------------------
  function circlesHit(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    const rr = (a.r + b.r);
    return dx * dx + dy * dy <= rr * rr;
  }
  function rectContains(r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // Push the player out of any obstacle they're overlapping. Called after
  // movement so obstacles act as solid walls without doing full physics.
  function pushPlayerOutOfObstacles() {
    if (!currentRoom.obstacles) return;
    for (const o of currentRoom.obstacles) {
      const dx = player.x - o.x, dy = player.y - o.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const min = player.r + o.r;
      if (d < min) {
        player.x = o.x + (dx / d) * min;
        player.y = o.y + (dy / d) * min;
      }
    }
    // Re-clamp inside room bounds in case the push shoved us through a wall.
    if (player.x < currentRoom.left + player.r)   player.x = currentRoom.left + player.r;
    if (player.x > currentRoom.right - player.r)  player.x = currentRoom.right - player.r;
    if (player.y < currentRoom.top + player.r)    player.y = currentRoom.top + player.r;
    if (player.y > currentRoom.bottom - player.r) player.y = currentRoom.bottom - player.r;
  }

  // Apply a bomb's blast: damage enemies/boss in radius, destroy obstacles,
  // knock everything outward, chain-detonate nearby bombs, shake the screen.
  // Collision uses (R + entity.r) so an enemy at the edge still gets clipped.
  function applyBombBlast(b) {
    const R = b.blastR;
    // Returns 0..1 falloff from center: full power inside ~40% of R, then taper.
    const falloff = (d, rTotal) => {
      const inner = rTotal * 0.4;
      if (d <= inner) return 1;
      return Math.max(0, 1 - (d - inner) / (rTotal - inner));
    };

    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      const reach = R + e.r;
      const d2 = dx * dx + dy * dy;
      if (d2 > reach * reach) continue;
      const d = Math.sqrt(d2) || 0.0001;
      const power = falloff(d, reach);
      const knockMag = 360 * power;
      e.takeDamage(b.blastDamage, { x: (dx / d) * knockMag, y: (dy / d) * knockMag });
    }
    if (boss && !boss.dead) {
      const dx = boss.x - b.x, dy = boss.y - b.y;
      const reach = R + boss.r;
      if (dx * dx + dy * dy <= reach * reach) boss.takeDamage(b.blastDamage);
    }
    if (currentRoom.obstacles) {
      for (const o of currentRoom.obstacles) {
        const dx = o.x - b.x, dy = o.y - b.y;
        const reach = R + o.r;
        if (dx * dx + dy * dy <= reach * reach) o.destroyByBomb();
      }
    }
    // Player caught in their own blast — 1 full heart, blown outward.
    {
      const dx = player.x - b.x, dy = player.y - b.y;
      const reach = R + player.r;
      const d2 = dx * dx + dy * dy;
      if (d2 <= reach * reach) {
        const d = Math.sqrt(d2) || 0.0001;
        if (player.takeDamage(2)) {
          // takeDamage returned true => not in iframes => add knockback.
          player.vx += (dx / d) * 320;
          player.vy += (dy / d) * 320;
        }
      }
    }
    // Chain-detonate other bombs caught in this blast — next-frame fuse trim.
    for (const other of bombs) {
      if (other === b || other.exploded) continue;
      const dx = other.x - b.x, dy = other.y - b.y;
      const reach = R + other.r;
      if (dx * dx + dy * dy <= reach * reach) other.chainIgnite();
    }
    spawnExplosionParticles(particles, b.x, b.y);
    addShake(0.7);
    addHitPause(110);
  }

  // --- Loop ------------------------------------------------------------------
  let lastT = performance.now();
  function frame(now) {
    // Cap dt so a tab switch doesn't teleport everything across the room.
    let dt = (now - lastT) / 1000;
    if (dt > 0.05) dt = 0.05;
    lastT = now;

    handleStateInput();
    if (state === STATE.PLAYING) {
      // Hit pause: clamp the effective dt to 0 while the timer is running so
      // the world freezes for a beat after big impacts. We still call update()
      // (with effDt=0) so one-shot input like bomb placement is consumed.
      let effDt = dt;
      if (hitPauseMs > 0) {
        hitPauseMs = Math.max(0, hitPauseMs - dt * 1000);
        effDt = 0;
      }
      update(effDt);
    }
    render();

    Input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Expose nothing — module is self-contained. Returning {} just keeps the
  // pattern consistent with other modules.
  return {};
})();
