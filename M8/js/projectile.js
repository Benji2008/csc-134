// projectile.js — bullets fired by player and enemies share one shape.
// `side` is 'player' or 'enemy' so collision code knows who can hit who.
// Optional flags (piercing, homing, bouncing) are toggled by player items.

class Projectile {
  constructor(x, y, vx, vy, side, opts = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.side = side;
    this.r = opts.radius ?? (side === 'player' ? C.PLAYER_BULLET_RADIUS : C.ENEMY_BULLET_RADIUS);
    this.ttl = opts.ttl ?? (side === 'player' ? C.PLAYER_BULLET_TTL_MS : C.ENEMY_BULLET_TTL_MS);
    this.damage = opts.damage ?? 1;
    this.piercing = !!opts.piercing;
    this.homing   = !!opts.homing;
    this.bouncing = !!opts.bouncing;
    this.charged  = !!opts.charged;
    this.bouncesLeft = this.bouncing ? 1 : 0;
    // For piercing — list of enemy/boss refs already hit so we don't hit twice.
    this.alreadyHit = new Set();
    this.dead = false;
  }

  update(dt, room, enemies, boss) {
    // Homing: gently bend velocity toward the nearest enemy/boss each frame.
    if (this.homing && this.side === 'player') {
      const target = nearestTarget(this.x, this.y, enemies, boss);
      if (target) {
        const dx = target.x - this.x, dy = target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        const turnRate = 320; // px/s of velocity change toward target
        this.vx += (dx / d) * turnRate * dt;
        this.vy += (dy / d) * turnRate * dt;
        // Re-normalize to keep a constant speed.
        const sp = Math.hypot(this.vx, this.vy) || 1;
        const targetSp = C.PLAYER_BULLET_SPEED;
        this.vx = (this.vx / sp) * targetSp;
        this.vy = (this.vy / sp) * targetSp;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt * 1000;
    if (this.ttl <= 0) this.dead = true;

    // Walls. Bouncing bullets reflect once instead of dying.
    let hitWall = null;
    if (this.x < room.left + this.r)   hitWall = 'w';
    else if (this.x > room.right - this.r)  hitWall = 'e';
    else if (this.y < room.top + this.r)    hitWall = 'n';
    else if (this.y > room.bottom - this.r) hitWall = 's';
    if (hitWall) {
      if (this.bouncing && this.bouncesLeft > 0) {
        this.bouncesLeft -= 1;
        if (hitWall === 'w' || hitWall === 'e') this.vx = -this.vx;
        else this.vy = -this.vy;
        // Nudge off the wall so we don't immediately re-collide.
        if (hitWall === 'w') this.x = room.left + this.r + 1;
        if (hitWall === 'e') this.x = room.right - this.r - 1;
        if (hitWall === 'n') this.y = room.top + this.r + 1;
        if (hitWall === 's') this.y = room.bottom - this.r - 1;
      } else {
        this.dead = true;
      }
    }
  }

  // Called when this projectile hits something. Returns true if it should die.
  // Piercing bullets keep going (but won't hit the same target twice).
  onHit(target) {
    this.alreadyHit.add(target);
    return !this.piercing;
  }

  draw(ctx) {
    // Charged tears get a layered glow + sparkle so they read instantly as
    // "the big one". Draw the outer flare first, then the core, then a shine.
    if (this.charged) {
      const t = performance.now() / 90;
      const flicker = 1 + Math.sin(t) * 0.15;
      ctx.fillStyle = 'rgba(255, 240, 140, 0.30)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 1.9 * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 90, 0.55)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7c2';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(this.x - this.r * 0.35, this.y - this.r * 0.35, this.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = this.side === 'player' ? C.COLOR_PLAYER_BULLET : C.COLOR_ENEMY_BULLET;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    // Piercing bullets get a halo so the player can see the upgrade is active.
    if (this.piercing) {
      ctx.strokeStyle = 'rgba(255, 247, 194, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Used by homing bullets — find the nearest live enemy or boss.
function nearestTarget(x, y, enemies, boss) {
  let best = null, bestD = Infinity;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
    if (d < bestD) { bestD = d; best = e; }
  }
  if (boss && !boss.dead) {
    const d = (boss.x - x) * (boss.x - x) + (boss.y - y) * (boss.y - y);
    if (d < bestD) { bestD = d; best = boss; }
  }
  return best;
}
