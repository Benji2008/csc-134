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
    this.seed = Math.random() * 9999;
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
    // Hefty drop shadow — bosses are big, looming things.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.92, this.r * 1.0, this.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const tSeed = twitchSeed(this.seed);
    ctx.fillStyle = this.hitFlash > 0 ? C.COLOR_HIT_FLASH : this.color;
    pathWobblyCircle(ctx, this.x, this.y, this.r, tSeed);
    ctx.fill();

    // Underbelly shadow for 2-tone shading.
    if (this.hitFlash <= 0) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(20, 4, 10, 0.32)';
      ctx.fillRect(this.x - this.r, this.y + this.r * 0.1, this.r * 2, this.r);
      ctx.restore();
    }

    ctx.strokeStyle = '#080306';
    ctx.lineWidth = 3.4;
    pathWobblyCircle(ctx, this.x, this.y, this.r, tSeed);
    ctx.stroke();

    if (this.hitFlash > 0) return;

    // Single huge cyclops eye on every boss — the "giant eye" of BoI bosses.
    const eyeR = this.r * 0.34;
    const ex = this.x - this.r * 0.05;
    const ey = this.y - this.r * 0.18;
    ctx.fillStyle = '#f4e8cf';
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#080306';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // Pupil shifts subtly with time — restless.
    const px = ex + Math.sin(this.t * 0.8) * eyeR * 0.3;
    const py = ey + Math.cos(this.t * 1.3) * eyeR * 0.3;
    ctx.fillStyle = '#0a0508';
    ctx.beginPath();
    ctx.arc(px, py, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Gash of a mouth at the bottom — rotten teeth telegraphing menace.
    ctx.fillStyle = '#1a0a0a';
    const mw = this.r * 0.55, mh = this.r * 0.22;
    const mx = this.x - mw / 2;
    const my = this.y + this.r * 0.30;
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = '#080306';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(mx, my, mw, mh);
    // Teeth.
    ctx.fillStyle = '#d8c898';
    const teeth = 4;
    for (let i = 0; i < teeth; i++) {
      const tx = mx + (i + 0.5) * (mw / teeth) - 1.5;
      ctx.fillRect(tx, my, 3, mh * 0.55);
    }
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

// --- Floor random: The Twins ------------------------------------------------
// Two-headed boss — fires twin shots from each head, chases the player. When
// bloodied, both heads fire faster and a spread tracks the player.
class GeminiBoss extends Boss {
  constructor(x, y, opts = {}) {
    super(x, y, Object.assign({
      hp: 46, radius: 30, color: '#ff7ab0', name: 'The Twins'
    }, opts));
    this.s.fireT = 0.6;
    this.s.swayT = 0;
  }

  update(dt, room, player, projectiles) {
    super.update(dt);
    // Sway side-to-side while drifting toward the player.
    this.s.swayT += dt * 2.2;
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = this.hp <= this.maxHp * 0.5 ? 105 : 75;
    this.x += (dx / d) * speed * dt + Math.cos(this.s.swayT) * 30 * dt;
    this.y += (dy / d) * speed * dt;

    // Each head fires alternately from its offset position.
    this.s.fireT -= dt;
    if (this.s.fireT <= 0) {
      const bs = C.ENEMY_BULLET_SPEED;
      const offsets = [-this.r * 0.55, this.r * 0.55];
      const base = Math.atan2(dy, dx);
      const cone = this.hp <= this.maxHp * 0.5 ? 0.18 : 0;
      for (const ox of offsets) {
        for (const dA of (cone ? [-cone, 0, cone] : [0])) {
          const a = base + dA;
          projectiles.push(new Projectile(
            this.x + ox, this.y, Math.cos(a) * bs, Math.sin(a) * bs, 'enemy'
          ));
        }
      }
      this.s.fireT = this.hp <= this.maxHp * 0.5 ? 0.55 : 0.85;
    }
  }

  draw(ctx) {
    // Custom: draw two heads instead of the single boss circle.
    // Drop shadow first.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.95, this.r * 1.1, this.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const tSeed = twitchSeed(this.seed);
    const flashing = this.hitFlash > 0;
    const headR = this.r * 0.78;
    for (const sign of [-1, 1]) {
      const hx = this.x + sign * this.r * 0.55;
      const hy = this.y;
      ctx.fillStyle = flashing ? C.COLOR_HIT_FLASH : this.color;
      pathWobblyCircle(ctx, hx, hy, headR, tSeed + sign);
      ctx.fill();
      ctx.strokeStyle = '#080306';
      ctx.lineWidth = 3.2;
      pathWobblyCircle(ctx, hx, hy, headR, tSeed + sign);
      ctx.stroke();
      if (flashing) continue;
      // One angry eye per head, tracking the world.
      ctx.fillStyle = '#f4e8cf';
      ctx.beginPath();
      ctx.arc(hx, hy - headR * 0.2, headR * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#080306';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#0a0508';
      ctx.beginPath();
      ctx.arc(hx + Math.sin(this.t * 1.3 + sign) * 3, hy - headR * 0.2 + Math.cos(this.t * 0.9 + sign) * 2, headR * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- Floor random: The Widow ------------------------------------------------
// Stationary brood-mother — periodically summons walkers/flies and fires
// expanding nova rings.
class WidowBoss extends Boss {
  constructor(x, y, opts = {}) {
    super(x, y, Object.assign({
      hp: 52, radius: 34, color: '#7a3a8a', name: 'The Widow'
    }, opts));
    this.s.summonT = 1.4;
    this.s.novaT = 2.4;
  }

  update(dt, room, player, projectiles, spawnEnemy) {
    super.update(dt);
    this.s.summonT -= dt;
    this.s.novaT -= dt;

    if (this.s.summonT <= 0) {
      const kind = Math.random() < 0.55 ? 'fly' : 'walker';
      const ang = Math.random() * Math.PI * 2;
      const e = makeEnemy(kind, this.x + Math.cos(ang) * 40, this.y + Math.sin(ang) * 40, 3);
      spawnEnemy(e);
      this.s.summonT = this.hp <= this.maxHp * 0.5 ? 1.6 : 2.6;
    }

    if (this.s.novaT <= 0) {
      const bs = C.ENEMY_BULLET_SPEED * 0.9;
      const n = this.hp <= this.maxHp * 0.5 ? 14 : 10;
      const offset = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = offset + (i / n) * Math.PI * 2;
        projectiles.push(new Projectile(
          this.x, this.y, Math.cos(a) * bs, Math.sin(a) * bs, 'enemy'
        ));
      }
      this.s.novaT = this.hp <= this.maxHp * 0.5 ? 1.8 : 2.6;
    }
  }

  draw(ctx) {
    super.draw(ctx);
    // Six little legs sticking out so she reads as a spider-thing.
    ctx.strokeStyle = '#080306';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.sin(this.t * 1.8 + i) * 0.15;
      const x1 = this.x + Math.cos(a) * this.r;
      const y1 = this.y + Math.sin(a) * this.r;
      const x2 = this.x + Math.cos(a) * (this.r + 14);
      const y2 = this.y + Math.sin(a) * (this.r + 14);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

// --- Floor random: The Mauler -----------------------------------------------
// Triple-dash boss — winds up, then dashes 3 times in quick succession at the
// player's position at each dash start. Fast and punishing.
class MaulerBoss extends Boss {
  constructor(x, y, opts = {}) {
    super(x, y, Object.assign({
      hp: 58, radius: 30, color: '#e06030', name: 'The Mauler'
    }, opts));
    this.s.windupT = 1.0;
    this.s.dashing = false;
    this.s.dashesLeft = 0;
    this.s.dashT = 0;
    this.s.dashVx = 0; this.s.dashVy = 0;
  }

  update(dt, room, player, projectiles) {
    super.update(dt);
    if (!this.s.dashing) {
      // Edge toward the player slowly during the wind-up so it's not static.
      const dx = player.x - this.x, dy = player.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.x += (dx / d) * 40 * dt;
      this.y += (dy / d) * 40 * dt;

      this.s.windupT -= dt;
      if (this.s.windupT <= 0) {
        // Start a 3-dash burst, fresh aim each dash.
        this.s.dashesLeft = this.hp <= this.maxHp * 0.5 ? 4 : 3;
        this.startDash(player);
      }
    } else {
      this.x += this.s.dashVx * dt;
      this.y += this.s.dashVy * dt;
      this.s.dashT -= dt;
      if (this.s.dashT <= 0) {
        this.s.dashesLeft -= 1;
        if (this.s.dashesLeft > 0) {
          this.startDash(player);
        } else {
          this.s.dashing = false;
          this.s.windupT = this.hp <= this.maxHp * 0.5 ? 0.7 : 1.1;
        }
      }
    }
  }

  startDash(player) {
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 420;
    this.s.dashVx = (dx / d) * speed;
    this.s.dashVy = (dy / d) * speed;
    this.s.dashing = true;
    this.s.dashT = 0.32;
  }

  draw(ctx) {
    // Telegraph wind-up with a glowing ring.
    if (!this.s.dashing && this.s.windupT < 0.6) {
      const t = 1 - (this.s.windupT / 0.6);
      ctx.strokeStyle = `rgba(255, 180, 80, ${0.5 + 0.4 * Math.sin(this.t * 18)})`;
      ctx.lineWidth = 3 + t * 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 6 + t * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    super.draw(ctx);
    // Bony horns to differentiate from the slime.
    ctx.fillStyle = '#d8c898';
    ctx.strokeStyle = '#080306';
    ctx.lineWidth = 2;
    for (const sign of [-1, 1]) {
      const bx = this.x + sign * this.r * 0.55;
      const by = this.y - this.r * 0.78;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + sign * 6, by - 12);
      ctx.lineTo(bx + sign * 12, by + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

// Boss difficulty tiers — floors.js picks randomly within the tier matching
// the current floor so the curve still ramps, but you don't see the same
// boss in the same slot every run.
const BOSS_TIERS = {
  easy:   ['slime', 'sentinel'],
  medium: ['hunter', 'conjurer', 'widow', 'gemini'],
  hard:   ['warden', 'mauler'],
};

function tierForFloor(floorIdx) {
  if (floorIdx <= 1) return 'easy';
  if (floorIdx <= 3) return 'medium';
  return 'hard';
}

// Pick a random boss for this floor, avoiding ones already used this run when
// possible. Falls back to the full tier if everything has been used.
function pickBossForFloor(floorIdx, alreadyUsed = []) {
  const tier = tierForFloor(floorIdx);
  const pool = BOSS_TIERS[tier].filter(k => !alreadyUsed.includes(k));
  const choices = pool.length ? pool : BOSS_TIERS[tier];
  return choices[Math.floor(Math.random() * choices.length)];
}

// Factory used by floors.js — keeps floor data declarative.
function makeBoss(kind, x, y) {
  switch (kind) {
    case 'slime':    return new SlimeBoss(x, y);
    case 'sentinel': return new SentinelBoss(x, y);
    case 'hunter':   return new HunterBoss(x, y);
    case 'conjurer': return new ConjurerBoss(x, y);
    case 'warden':   return new WardenBoss(x, y);
    case 'gemini':   return new GeminiBoss(x, y);
    case 'widow':    return new WidowBoss(x, y);
    case 'mauler':   return new MaulerBoss(x, y);
    default: throw new Error('unknown boss: ' + kind);
  }
}
