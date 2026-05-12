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

  // --- Run lifecycle --------------------------------------------------------
  function startRun() {
    player = new Player(C.CANVAS_W / 2, C.CANVAS_H / 2);
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
    for (const b of bombs) {
      const wasExploded = b.exploded;
      b.update(dt);
      // Fire the blast the frame the bomb just exploded.
      if (!wasExploded && b.exploded) {
        applyBombBlast(b);
      }
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
    //    going (won't hit the same target twice).
    for (const p of projectiles) {
      if (p.dead || p.side !== 'player') continue;
      for (const e of enemies) {
        if (e.dead) continue;
        if (p.alreadyHit.has(e)) continue;
        if (circlesHit(p, e)) {
          e.takeDamage(p.damage);
          spawnHitBurst(particles, p.x, p.y, '#fff7c2');
          if (p.onHit(e)) { p.dead = true; break; }
        }
      }
      if (!p.dead && boss && !boss.dead && !p.alreadyHit.has(boss) && circlesHit(p, boss)) {
        boss.takeDamage(p.damage);
        spawnHitBurst(particles, p.x, p.y, '#ffd87a');
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
        }
      }
    }

    // Particles update / cleanup.
    for (const pa of particles) pa.update(dt);
    particles = particles.filter(pa => !pa.dead);

    // 6. Contact damage from enemies / boss touching the player.
    for (const e of enemies) {
      if (e.dead) continue;
      if (circlesHit(e, player)) player.takeDamage(e.contactDamage);
    }
    if (boss && !boss.dead && circlesHit(boss, player)) player.takeDamage(boss.contactDamage);

    // 7. Hunter trail damage (and any future hazards). Skip if boss is dead so
    // lingering trail blobs don't keep hitting the player after the kill.
    if (boss && !boss.dead && boss.getHazards) {
      for (const h of boss.getHazards()) {
        if (circlesHit(h, player)) player.takeDamage(h.damage);
      }
    }

    // 8. Resolve enemy deaths (handle splitter spawns + Vampire heal).
    const survivors = [];
    for (const e of enemies) {
      if (e.dead) {
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

    // 8b. Resolve boss death — bigger splat, fatter gore.
    if (boss && boss.dead && !boss._gored) {
      currentRoom.addBloodSplat(boss.x, boss.y, { big: true });
      spawnGoreBurst(particles, boss.x, boss.y, { big: true });
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

    // 11.5 Treasure pickup: if the player walks onto the pedestal, apply the item.
    if (currentRoom.kind === 'treasure' && !currentRoom.itemTaken && currentRoom.itemId) {
      const cx = (currentRoom.left + currentRoom.right) / 2;
      const cy = (currentRoom.top + currentRoom.bottom) / 2 - 14;
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
      UI.drawHUD(ctx, player, floorIdx, runTimeMs);
      UI.drawMinimap(ctx, floor, currentRoom);
      if (boss && !boss.dead) UI.drawBossBar(ctx, boss);
      if (pickupToast.ttl > 0) {
        UI.drawPickupToast(ctx, pickupToast.text, pickupToast.ttl);
        if (state === STATE.PLAYING) pickupToast.ttl -= 16; // approx ms/frame
      }
      if (state === STATE.PAUSED) UI.drawPause(ctx);
    } else if (state === STATE.TITLE) {
      UI.drawTitle(ctx, stats);
    } else if (state === STATE.GAME_OVER) {
      UI.drawGameOver(ctx, stats, floorIdx);
    } else if (state === STATE.VICTORY) {
      UI.drawVictory(ctx, stats, runTimeMs, lastVictoryWasBest);
    }
  }

  // --- State input handling --------------------------------------------------
  function handleStateInput() {
    if (state === STATE.TITLE) {
      if (Input.wasPressed(' ')) startRun();
      // Wipe stats with Shift+R on the title screen — useful for testing.
      if (Input.isDown('shift') && Input.wasPressed('r')) {
        stats = Storage.fresh();
        Storage.save(stats);
      }
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
  // spawn smoke + ember particles, and shake the screen lightly.
  function applyBombBlast(b) {
    const R = b.blastR;
    const R2 = R * R;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy <= R2) e.takeDamage(b.blastDamage);
    }
    if (boss && !boss.dead) {
      const dx = boss.x - b.x, dy = boss.y - b.y;
      if (dx * dx + dy * dy <= (R + boss.r) * (R + boss.r)) boss.takeDamage(b.blastDamage);
    }
    if (currentRoom.obstacles) {
      for (const o of currentRoom.obstacles) {
        const dx = o.x - b.x, dy = o.y - b.y;
        if (dx * dx + dy * dy <= R2) o.destroyByBomb();
      }
    }
    // Player caught in their own blast — half damage, ignoring iframes is fine.
    {
      const dx = player.x - b.x, dy = player.y - b.y;
      if (dx * dx + dy * dy <= R2) player.takeDamage(2);
    }
    spawnExplosionParticles(particles, b.x, b.y);
  }

  // --- Loop ------------------------------------------------------------------
  let lastT = performance.now();
  function frame(now) {
    // Cap dt so a tab switch doesn't teleport everything across the room.
    let dt = (now - lastT) / 1000;
    if (dt > 0.05) dt = 0.05;
    lastT = now;

    handleStateInput();
    if (state === STATE.PLAYING) update(dt);
    render();

    Input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Expose nothing — module is self-contained. Returning {} just keeps the
  // pattern consistent with other modules.
  return {};
})();
