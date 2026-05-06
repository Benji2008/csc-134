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

    // Runtime state
    this.iframes = 0;               // ms remaining
    this.fireCooldown = 0;
    this.lookX = 0; this.lookY = 1;
    this.muzzleFlash = 0;
    // Items collected during this run (array of item ids), shown in HUD.
    this.items = [];
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
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv; dy *= inv;
    }

    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;

    // Clamp to room bounds.
    if (this.x < room.left + this.r)   this.x = room.left + this.r;
    if (this.x > room.right - this.r)  this.x = room.right - this.r;
    if (this.y < room.top + this.r)    this.y = room.top + this.r;
    if (this.y > room.bottom - this.r) this.y = room.bottom - this.r;

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
      ctx.arc(this.x + this.lookX * (this.r + 4), this.y + this.lookY * (this.r + 4), 12 * t, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flicker while invulnerable so the player can read the i-frame state.
    const flickerOff = this.iframes > 0 && Math.floor(this.iframes / 80) % 2 === 0;
    if (flickerOff) return;

    // Soft drop shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.85, this.r * 0.85, this.r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.iframes > 0 ? C.COLOR_PLAYER_IFRAME : C.COLOR_PLAYER;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1620';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Two eyes pointing in the look direction.
    const ex = this.lookX, ey = this.lookY;
    const off = this.r * 0.4;
    const perpX = -ey, perpY = ex;
    ctx.fillStyle = '#fff';
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(this.x + ex * off * 0.4 + perpX * sign * off * 0.6,
              this.y + ey * off * 0.4 + perpY * sign * off * 0.6,
              3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1a1620';
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(this.x + ex * off * 0.55 + perpX * sign * off * 0.6,
              this.y + ey * off * 0.55 + perpY * sign * off * 0.6,
              1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
