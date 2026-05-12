// player.js — the hero. WASD to move, arrow keys to shoot in 4 directions.

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = C.PLAYER_RADIUS;
    // Stats live on the instance (not constants) so items can mutate them.
    this.maxHp = C.PLAYER_MAX_HP;
    this.hp = C.PLAYER_MAX_HP;
    this.soulHearts = 0;            // extra hits before regular HP, never auto-refilled
    this.speed = C.PLAYER_SPEED;
    this.iframesMax = C.PLAYER_IFRAMES_MS;
    this.fireCooldownMs = C.PLAYER_FIRE_COOLDOWN_MS;
    this.bulletSpeed = C.PLAYER_BULLET_SPEED;
    this.bulletDamage = C.PLAYER_BULLET_DAMAGE;
    this.bulletRadius = C.PLAYER_BULLET_RADIUS;
    this.bulletTtlMs = C.PLAYER_BULLET_TTL_MS;
    // Bullet behavior flags — items toggle these.
    this.shotPattern = 'single';    // 'single' | 'twin' | 'spread'
    this.bulletPiercing = false;
    this.bulletHoming = false;
    this.bulletBouncing = false;
    // Vampire counter: every Nth kill, heal half a heart.
    this.vampireKillsNeeded = 0;    // 0 = vampire item not picked up
    this.vampireKills = 0;

    // Pickups inventory.
    this.coins = 0;
    this.bombs = 1;
    this.maxBombs = 9;
    this.keys = 1;       // start with one so floor 1 isn't a dead-end if no keys drop
    this.maxKeys = 99;
    // Item-effect flags.
    this.luckBoost = 1.0;            // multiplies enemy drop chance
    this.pickupMagnet = false;       // pickups within range fly toward player
    this.fastDiagonal = false;       // disables diagonal normalization

    // Runtime state
    this.iframes = 0;               // ms remaining
    this.fireCooldown = 0;
    this.lookX = 0; this.lookY = 1;
    this.muzzleFlash = 0;
    // Velocity for smooth accel/decel — gives weight without feeling drifty.
    this.vx = 0; this.vy = 0;
    // Items collected during this run (array of item ids), shown in HUD.
    this.items = [];

    // Tears — Isaac is permanently crying. Each entry: {x,y,vx,vy,r,ttl,maxTtl}.
    this.tears = [];
    this.tearSpawnT = 0.4; // sec until next tear
    this.tearSide = 1;     // alternates so both eyes weep

    // Hand-drawn wobble: stable per-instance seed so the silhouette doesn't shimmer.
    this.seed = Math.random() * 9999;
    // Walk-cycle phase. Accumulates only while moving so idle is still.
    this.walkT = 0;
    this.moving = false;
  }

  update(dt, room, projectiles) {
    // --- movement ---
    // Movement is WASD only. Arrow keys are reserved for shooting so we don't
    // get the awkward case where pressing left both moves and fires you left.
    let dx = 0, dy = 0;
    if (Input.isDown('a')) dx -= 1;
    if (Input.isDown('d')) dx += 1;
    if (Input.isDown('w')) dy -= 1;
    if (Input.isDown('s')) dy += 1;

    // Normalize diagonals — pythagoras would otherwise let you go ~1.4x faster.
    // The Big Step item disables normalization for a speed-demon feel.
    if (dx !== 0 && dy !== 0 && !this.fastDiagonal) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv; dy *= inv;
    }

    // Velocity-based movement. Accel ramps in fast (~0.08s to top speed) and
    // decel is slightly snappier (~0.06s to stop) so the player feels weighty
    // but never sluggish — Isaac-style tight control with a hint of skid.
    const targetVx = dx * this.speed;
    const targetVy = dy * this.speed;
    // Exponential approach: rate is "per second"; convert with 1 - exp(-k*dt).
    const accelK = 18;   // higher = snappier acceleration
    const decelK = 22;   // higher = snappier stop
    const kx = (dx !== 0) ? accelK : decelK;
    const ky = (dy !== 0) ? accelK : decelK;
    this.vx += (targetVx - this.vx) * (1 - Math.exp(-kx * dt));
    this.vy += (targetVy - this.vy) * (1 - Math.exp(-ky * dt));
    // Dead zone so we don't creep at sub-pixel speeds when standing still.
    if (dx === 0 && Math.abs(this.vx) < 4) this.vx = 0;
    if (dy === 0 && Math.abs(this.vy) < 4) this.vy = 0;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Walk bob — phase tracks actual speed, not raw input, so the bob ramps
    // in/out with the accel curve instead of snapping on/off.
    const speedNow = Math.hypot(this.vx, this.vy);
    this.moving = speedNow > 8;
    if (this.moving) this.walkT += dt * 11 * (speedNow / this.speed);

    // Clamp to room bounds. Zero the velocity on the clamped axis so you don't
    // build up phantom momentum while held against a wall.
    if (this.x < room.left + this.r)   { this.x = room.left + this.r;   if (this.vx < 0) this.vx = 0; }
    if (this.x > room.right - this.r)  { this.x = room.right - this.r;  if (this.vx > 0) this.vx = 0; }
    if (this.y < room.top + this.r)    { this.y = room.top + this.r;    if (this.vy < 0) this.vy = 0; }
    if (this.y > room.bottom - this.r) { this.y = room.bottom - this.r; if (this.vy > 0) this.vy = 0; }

    // --- shooting ---
    // Movement uses WASD, shooting uses arrows — classic twin-stick on a keyboard.
    this.fireCooldown -= dt * 1000;
    if (this.fireCooldown <= 0) {
      let sx = 0, sy = 0;
      if (Input.isDown('arrowleft'))  sx -= 1;
      if (Input.isDown('arrowright')) sx += 1;
      if (Input.isDown('arrowup'))    sy -= 1;
      if (Input.isDown('arrowdown'))  sy += 1;
      // Prefer cardinal direction if multiple are held; horizontal wins ties.
      if (sx !== 0) sy = 0;
      if (sx !== 0 || sy !== 0) {
        this.shoot(sx, sy, projectiles);
        this.fireCooldown = this.fireCooldownMs;
        this.lookX = sx; this.lookY = sy;
        this.muzzleFlash = 70;
      }
    }

    // --- timers ---
    if (this.iframes > 0) this.iframes -= dt * 1000;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt * 1000;

    // --- tears: spawn + advance ---
    this.tearSpawnT -= dt;
    if (this.tearSpawnT <= 0) {
      // Drop from one of the two eyes (alternates). Eyes are at a fixed
      // horizontal layout on the face so tears fall straight down from each.
      const off = this.r * 0.42;
      const sign = this.tearSide;
      const tx = this.x + sign * off * 0.7;
      const ty = this.y - off * 0.15 + 2;
      this.tears.push({
        x: tx, y: ty,
        vx: (Math.random() - 0.5) * 24,
        vy: 40 + Math.random() * 20,
        r: 2 + Math.random() * 1.2,
        ttl: 650, maxTtl: 650,
      });
      this.tearSide = -this.tearSide;
      this.tearSpawnT = 0.45 + Math.random() * 0.5;
    }
    for (const t of this.tears) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += 240 * dt; // gravity
      t.vx *= 0.96;
      t.ttl -= dt * 1000;
    }
    this.tears = this.tears.filter(t => t.ttl > 0);
  }

  // Spawn 1+ projectiles based on the player's current shot pattern.
  // Twin = two parallel bullets; Spread = three bullets in a small arc.
  shoot(sx, sy, projectiles) {
    const speed = this.bulletSpeed;
    const opts = {
      radius: this.bulletRadius,
      ttl: this.bulletTtlMs,
      damage: this.bulletDamage,
    };
    if (this.bulletPiercing) opts.piercing = true;
    if (this.bulletHoming) opts.homing = true;
    if (this.bulletBouncing) opts.bouncing = true;

    if (this.shotPattern === 'twin') {
      // Two parallel bullets offset along the perpendicular.
      const perpX = -sy, perpY = sx;
      const off = 8;
      projectiles.push(new Projectile(
        this.x + perpX * off, this.y + perpY * off,
        sx * speed, sy * speed, 'player', opts
      ));
      projectiles.push(new Projectile(
        this.x - perpX * off, this.y - perpY * off,
        sx * speed, sy * speed, 'player', opts
      ));
    } else if (this.shotPattern === 'spread') {
      // Three-bullet narrow cone.
      const baseAngle = Math.atan2(sy, sx);
      const spread = 0.18; // ~10 degrees
      for (const dA of [-spread, 0, spread]) {
        const a = baseAngle + dA;
        projectiles.push(new Projectile(
          this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, 'player', opts
        ));
      }
    } else {
      projectiles.push(new Projectile(
        this.x, this.y, sx * speed, sy * speed, 'player', opts
      ));
    }
  }

  takeDamage(amount) {
    if (this.iframes > 0) return false;
    // Soul hearts soak hits before regular HP.
    if (this.soulHearts > 0) {
      this.soulHearts -= 1;
    } else {
      this.hp -= amount;
    }
    this.iframes = this.iframesMax;
    return true;
  }

  // Called by the main loop when an enemy dies, so the Vampire item works.
  onEnemyKilled() {
    if (this.vampireKillsNeeded <= 0) return;
    this.vampireKills += 1;
    if (this.vampireKills >= this.vampireKillsNeeded) {
      this.vampireKills = 0;
      this.heal(1);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  isDead() {
    return this.hp <= 0;
  }

  draw(ctx) {
    // Muzzle flash drawn UNDER the player so the player isn't washed out.
    if (this.muzzleFlash > 0) {
      const t = this.muzzleFlash / 70;
      ctx.fillStyle = `rgba(255, 247, 194, ${0.45 * t})`;
      ctx.beginPath();
      ctx.arc(this.x + this.lookX * (this.r + 4), this.y + this.lookY * (this.r + 4), 13 * t, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flicker while invulnerable so the player can read the i-frame state.
    const flickerOff = this.iframes > 0 && Math.floor(this.iframes / 80) % 2 === 0;
    if (flickerOff) return;

    // Walk bob — vertical bounce while moving. Head bobs harder than the
    // body so the silhouette reads as a kid bouncing on his feet.
    const bobY = this.moving ? Math.sin(this.walkT) * 2.0 : 0;
    const py = this.y + bobY;

    // Soft drop shadow — stays on the ground regardless of bob, anchored to
    // where the feet land.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 1.65, this.r * 1.00, this.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body lump + feet beneath the head — BoI-style silhouette.
    const bodyColor = this.iframes > 0 ? '#fff4d4' : '#f0d8b0';
    drawCreatureBody(ctx, this.x, this.y, this.r, {
      bodyColor, outline: '#1a0d10', footColor: '#2a1818',
      moving: this.moving, phase: this.walkT, seed: this.seed,
    });

    // Head — wobbly pale-flesh circle with thick dark outline.
    // Color shifts slightly during iframes so hits read clearly.
    const headColor = this.iframes > 0 ? '#fff4d4' : '#f0d8b0';
    ctx.fillStyle = headColor;
    pathWobblyCircle(ctx, this.x, py, this.r, this.seed);
    ctx.fill();
    // Soft underbelly shadow on the head — 2-tone shading per BoI guide.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(120, 70, 60, 0.32)';
    ctx.fillRect(this.x - this.r, py + this.r * 0.15, this.r * 2, this.r);
    ctx.restore();
    // Thick ink outline.
    ctx.strokeStyle = '#1a0d10';
    ctx.lineWidth = 2.8;
    pathWobblyCircle(ctx, this.x, py, this.r, this.seed);
    ctx.stroke();

    // Big asymmetric Isaac eyes. Eye SOCKETS are locked to a fixed horizontal
    // layout (the head always faces the camera) and only the pupils shift to
    // track the look direction — that's what sells the BoI 3/4-view feel
    // instead of pure top-down.
    const off = this.r * 0.42;
    const eyeR  = [this.r * 0.34, this.r * 0.30];
    const pupilR = [this.r * 0.16, this.r * 0.14];
    let i = 0;
    for (const sign of [-1, 1]) {
      const cxE = this.x + sign * off * 0.7;
      const cyE = py - off * 0.15;
      // white of the eye
      ctx.fillStyle = '#f8eed8';
      ctx.beginPath();
      ctx.arc(cxE, cyE, eyeR[i], 0, Math.PI * 2);
      ctx.fill();
      // dark eye outline
      ctx.strokeStyle = '#1a0d10';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // pupil tracks the look direction within the socket.
      ctx.fillStyle = '#0a0508';
      ctx.beginPath();
      ctx.arc(cxE + this.lookX * eyeR[i] * 0.40,
              cyE + this.lookY * eyeR[i] * 0.40,
              pupilR[i], 0, Math.PI * 2);
      ctx.fill();
      i++;
    }

    // Tiny mouth — crooked frown for that permanent BoI sadness.
    ctx.strokeStyle = '#3a1818';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const mx = this.x;
    const my = py + this.r * 0.38;
    ctx.moveTo(mx - 3, my + 1);
    ctx.lineTo(mx, my - 0.5);
    ctx.lineTo(mx + 3, my + 1);
    ctx.stroke();

    // Tears — glossy droplets dripping from the eyes.
    for (const t of this.tears) {
      const alpha = Math.min(1, t.ttl / t.maxTtl);
      ctx.fillStyle = `rgba(140, 200, 235, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(30, 60, 90, ${alpha * 0.8})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // highlight pip
      ctx.fillStyle = `rgba(240, 250, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.35, t.y - t.r * 0.35, t.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
