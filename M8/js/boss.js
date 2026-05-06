// boss.js — five bosses, each a subclass of Boss with its own update logic.
// Bosses share an HP bar and on-death trigger but their attack patterns differ.

class Boss {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.r = opts.radius ?? 32;
    this.hp = opts.hp ?? 30;
    this.maxHp = this.hp;
    this.contactDamage = 1;
    this.color = opts.color ?? '#aa3355';
    this.name = opts.name ?? 'Boss';
    this.dead = false;
    this.t = 0;
    this.hitFlash = 0;
    this.s = {};
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = C.HIT_FLASH_MS;
    if (this.hp <= 0) this.dead = true;
  }

  update(dt, room, player, projectiles, spawnEnemy) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt * 1000;
  }

  draw(ctx) {
    ctx.fillStyle = this.hitFlash > 0 ? C.COLOR_HIT_FLASH : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1620';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// --- Floor 1: The Slime ------------------------------------------------------
// Shambles toward the player. At 50% HP, splits into two smaller slimes.
class SlimeBoss extends Boss {
  constructor(x, y, opts = {}) {
    super(x, y, Object.assign({
      hp: 30, radius: 36, color: '#d56a7a', name: 'The Pustule'
    }, opts));
    this.s.split = false;
    this.s.hopT = 0;
    this.s.vx = 0; this.s.vy = 0;
  }

  update(dt, room, player, projectiles, spawnEnemy) {
    super.update(dt);
    // Hop toward player on a timer — gives a bouncy slime feel.
    this.s.hopT -= dt;
    if (this.s.hopT <= 0) {
      const dx = player.x - this.x, dy = player.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = 130;
      this.s.vx = (dx / d) * speed;
      this.s.vy = (dy / d) * speed;
      this.s.hopT = 0.9;
    }
    // Decay velocity between hops.
    this.x += this.s.vx * dt;
    this.y += this.s.vy * dt;
    this.s.vx *= 0.92;
    this.s.vy *= 0.92;

    // Phase 2: split once below 50% HP.
    if (!this.s.split && this.hp <= this.maxHp * 0.5) {
      this.s.split = true;
      spawnEnemy(new SlimeMinion(this.x - 30, this.y, false));
      spawnEnemy(new SlimeMinion(this.x + 30, this.y, true));
    }
  }
}

// Smaller slime spawned by SlimeBoss split. Treated as a regular enemy.
class SlimeMinion extends Enemy {
  constructor(x, y, mirrored) {
    super(x, y, 'walker', {
      hp: 4, speed: 110, color: '#9be0a8', radius: 18, contactDamage: 1
    });
  }
}

// --- Floor 2: The Sentinel ---------------------------------------------------
// Stationary turret. Sprays bullets in a rotating ring.
class SentinelBoss extends Boss {
  constructor(x, y, opts = {}) {
    super(x, y, Object.assign({
      hp: 38, radius: 30, color: '#c8d860', name: 'The Acid Sac'
    }, opts));
    this.s.angle = 0;
    this.s.fireT = 0;
    this.s.spokes = 6;
  }

  update(dt, room, player, projectiles) {
    super.update(dt);
    this.s.angle += dt * 0.7; // slow rotation

    this.s.fireT -= dt;
    if (this.s.fireT <= 0) {
      const speed = C.ENEMY_BULLET_SPEED;
      // Phase 2: more spokes when bloodied.
      const spokes = this.hp <= this.maxHp * 0.5 ? 8 : 6;
      for (let i = 0; i < spokes; i++) {
        const a = this.s.angle + (i / spokes) * Math.PI * 2;
        projectiles.push(new Projectile(
          this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, 'enemy'
        ));
      }
      this.s.fireT = 0.55;
    }
  }

  draw(ctx) {
    super.draw(ctx);
    // Crosshair detail to look like a turret.
    ctx.strokeStyle = '#1a1620';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x - this.r * 0.6, this.y);
    ctx.lineTo(this.x + this.r * 0.6, this.y);
    ctx.moveTo(this.x, this.y - this.r * 0.6);
    ctx.lineTo(this.x, this.y + this.r * 0.6);
    ctx.stroke();
  }
}

// --- Floor 3: The Hunter -----------------------------------------------------
// Charges the player and leaves damaging trail blobs behind.
class HunterBoss extends Boss {
  constructor(x, y, opts = {}) {
    super(x, y, Object.assign({
      hp: 44, radius: 28, color: '#ff5060', name: 'The Clot'
    }, opts));
    this.s.dashing = false;
    this.s.dashT = 0.7;
    this.s.dashVx = 0; this.s.dashVy = 0;
    this.s.trailT = 0;
    this.s.trail = []; // {x,y,ttl}
  }

  update(dt, room, player, projectiles) {
    super.update(dt);
    if (!this.s.dashing) {
      this.s.dashT -= dt;
      if (this.s.dashT <= 0) {
        const dx = player.x - this.x, dy = player.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        const speed = 360;
        this.s.dashVx = (dx / d) * speed;
        this.s.dashVy = (dy / d) * speed;
        this.s.dashing = true;
        this.s.dashT = 0.55;
      }
    } else {
      this.x += this.s.dashVx * dt;
      this.y += this.s.dashVy * dt;
      this.s.dashT -= dt;
      // Drop trail blobs while dashing.
      this.s.trailT -= dt;
      if (this.s.trailT <= 0) {
        this.s.trail.push({ x: this.x, y: this.y, ttl: 1.6, r: 18 });
        this.s.trailT = 0.08;
      }
      if (this.s.dashT <= 0) {
        this.s.dashing = false;
        // Faster between-dash recovery in phase 2.
        this.s.dashT = this.hp <= this.maxHp * 0.5 ? 0.4 : 0.8;
      }
    }
    // Age trail blobs.
    for (const t of this.s.trail) t.ttl -= dt;
    this.s.trail = this.s.trail.filter(t => t.ttl > 0);
  }

  // Trail damage is checked by the main game loop via getHazards().
  getHazards() {
    return this.s.trail.map(t => ({ x: t.x, y: t.y, r: t.r, damage: 1 }));
  }

  draw(ctx) {
    // Draw trail under the boss.
    for (const t of this.s.trail) {
      const alpha = Math.min(1, t.ttl / 1.6);
      ctx.fillStyle = `rgba(224, 122, 58, ${0.35 * alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
    super.draw(ctx);
  }
}

// --- Floor 4: The Conjurer ---------------------------------------------------
// Teleports periodically, summons walkers and shooters.
class ConjurerBoss extends Boss {
  constructor(x, y, opts = {}) {
    super(x, y, Object.assign({
      hp: 50, radius: 28, color: '#9adfff', name: 'The Sporeling'
    }, opts));
    this.s.teleT = 2.5;
    this.s.summonT = 1.8;
  }

  update(dt, room, player, projectiles, spawnEnemy) {
    super.update(dt);
    this.s.teleT -= dt;
    this.s.summonT -= dt;

    if (this.s.teleT <= 0) {
      // Pick a random spot away from the player so it doesn't tele-kill.
      let nx, ny, tries = 0;
      do {
        nx = room.left + 80 + Math.random() * (room.width - 160);
        ny = room.top + 80 + Math.random() * (room.height - 160);
        tries++;
      } while (Math.hypot(nx - player.x, ny - player.y) < 140 && tries < 8);
      this.x = nx; this.y = ny;
      this.s.teleT = this.hp <= this.maxHp * 0.5 ? 1.6 : 2.6;
    }

    if (this.s.summonT <= 0) {
      const kind = Math.random() < 0.5 ? 'walker' : 'shooter';
      const e = makeEnemy(kind, this.x, this.y, 3);
      spawnEnemy(e);
      this.s.summonT = this.hp <= this.maxHp * 0.5 ? 2.2 : 3.4;
    }
  }
}

// --- Floor 5: The Warden -----------------------------------------------------
// Two real phases: bullet hell at full HP, then chase + ring at low HP.
class WardenBoss extends Boss {
  constructor(x, y, opts = {}) {
    super(x, y, Object.assign({
      hp: 70, radius: 34, color: '#c89aff', name: 'The Mind'
    }, opts));
    this.s.phase = 1;
    this.s.fireT = 0;
    this.s.angle = 0;
    this.s.moveT = 0;
    this.s.vx = 0; this.s.vy = 0;
  }

  update(dt, room, player, projectiles) {
    super.update(dt);
    if (this.s.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.s.phase = 2;
    }

    if (this.s.phase === 1) {
      // Phase 1: stand near center-ish, fire a slow alternating spiral.
      this.s.angle += dt * 1.2;
      this.s.fireT -= dt;
      if (this.s.fireT <= 0) {
        const speed = C.ENEMY_BULLET_SPEED;
        for (let i = 0; i < 4; i++) {
          const a = this.s.angle + (i / 4) * Math.PI * 2;
          projectiles.push(new Projectile(
            this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, 'enemy'
          ));
        }
        this.s.fireT = 0.18;
      }
    } else {
      // Phase 2: chase the player and emit short rings.
      const dx = player.x - this.x, dy = player.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.x += (dx / d) * 130 * dt;
      this.y += (dy / d) * 130 * dt;

      this.s.fireT -= dt;
      if (this.s.fireT <= 0) {
        const speed = C.ENEMY_BULLET_SPEED;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          projectiles.push(new Projectile(
            this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, 'enemy'
          ));
        }
        this.s.fireT = 1.2;
      }
    }
  }

  draw(ctx) {
    super.draw(ctx);
    // Inner ring color shift to telegraph phase.
    ctx.fillStyle = this.s.phase === 2 ? '#ffe' : '#1a1620';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Factory used by floors.js — keeps floor data declarative.
function makeBoss(kind, x, y) {
  switch (kind) {
    case 'slime':    return new SlimeBoss(x, y);
    case 'sentinel': return new SentinelBoss(x, y);
    case 'hunter':   return new HunterBoss(x, y);
    case 'conjurer': return new ConjurerBoss(x, y);
    case 'warden':   return new WardenBoss(x, y);
    default: throw new Error('unknown boss: ' + kind);
  }
}
