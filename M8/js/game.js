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
  let runTimeMs = 0;         // accumulated playing time; freezes during pause
  let lastVictoryWasBest = false;
  // Pickup toast — shown briefly when the player grabs an item.
  let pickupToast = { text: '', ttl: 0 };
  function showPickupToast(text) { pickupToast.text = text; pickupToast.ttl = 2800; }

  // --- Run lifecycle --------------------------------------------------------
  function startRun() {
    player = new Player(C.CANVAS_W / 2, C.CANVAS_H / 2);
    floorIdx = 0;
    enterFloor(0);
    runTimeMs = 0;
    state = STATE.PLAYING;
  }

  function enterFloor(idx) {
    floorIdx = idx;
    floor = buildFloor(idx);
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
    projectiles = [];
    particles = [];
    enemies = [];
    boss = null;

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

    // 2. Update enemies / boss. They may push new projectiles.
    for (const e of enemies) e.update(dt, currentRoom, player, projectiles, spawnEnemy);
    if (boss) boss.update(dt, currentRoom, player, projectiles, spawnEnemy);

    // 3. Update projectiles. Homing bullets need the enemy/boss list to find
    //    a target, so we pass them in.
    for (const p of projectiles) p.update(dt, currentRoom, enemies, boss);

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
        player.onEnemyKilled();
        for (const newE of e.onDeath()) survivors.push(newE);
      } else {
        survivors.push(e);
      }
    }
    enemies = survivors;

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
      if (rectContains(r, player.x, player.y)) {
        enterRoom(door.target, oppositeDir(dir));
        return;
      }
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
      for (const e of enemies) e.draw(ctx);
      if (boss && !boss.dead) boss.draw(ctx);
      player.draw(ctx);
      for (const p of projectiles) p.draw(ctx);
      for (const pa of particles) pa.draw(ctx);
      UI.drawHUD(ctx, player, floorIdx, runTimeMs);
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
