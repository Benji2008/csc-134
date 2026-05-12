// enemy.js — four enemy types share one class but pick a different `behavior`.
// Behaviors are kept as plain functions on a lookup table so adding a new enemy
// is just adding one entry plus a `case` in spawn().

class Enemy {
  constructor(x, y, kind, opts = {}) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.r = opts.radius ?? 16;
    this.hp = opts.hp ?? 3;
    this.contactDamage = opts.contactDamage ?? 1;
    this.color = opts.color ?? '#a45';
    this.speed = opts.speed ?? 70;
    this.dead = false;
    // BoI-style champion variants: a buffed rare version of any enemy with a
    // distinctive tint, an aura, and a guaranteed drop on death.
    // null | 'gold' | 'red' | 'black' | 'green'
    this.champion = opts.champion || null;

    // Per-behavior scratch state (timers, phase).
    this.t = 0;
    this.fireT = opts.fireT ?? (0.5 + Math.random() * 1.0); // sec until first shot
    this.dashT = 0;
    this.dashing = false;
    this.dashVx = 0;
    this.dashVy = 0;
    // Visual: hit-flash timer. Set to HIT_FLASH_MS on damage, decays each frame.
    this.hitFlash = 0;
    // Direction-facing for charger cue / walker eyes.
    this.faceX = 0;
    this.faceY = 1;
    // Per-instance wobble seed — combined with time for low-fps twitch animation.
    this.seed = Math.random() * 9999;
  }

  update(dt, room, player, projectiles, spawnQueue) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt * 1000;
    // Track facing toward player so eyes/spikes can point that way.
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.faceX = dx / d; this.faceY = dy / d;
    Enemy.behaviors[this.kind](this, dt, room, player, projectiles);
    // Keep enemies inside the room.
    if (this.x < room.left + this.r)   this.x = room.left + this.r;
    if (this.x > room.right - this.r)  this.x = room.right - this.r;
    if (this.y < room.top + this.r)    this.y = room.top + this.r;
    if (this.y > room.bottom - this.r) this.y = room.bottom - this.r;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = C.HIT_FLASH_MS;
    if (this.hp <= 0) this.dead = true;
  }

  // On death, some enemies leave behind something (splitter -> two walkers).
  // Returns an array of new Enemies to spawn, or empty.
  onDeath() {
    if (this.kind === 'splitter') {
      return [
        new Enemy(this.x - 16, this.y, 'walker', {
          radius: 14, hp: 1, speed: 90, color: '#d76d8a'
        }),
        new Enemy(this.x + 16, this.y, 'walker', {
          radius: 14, hp: 1, speed: 90, color: '#d76d8a'
        }),
      ];
    }
    return [];
  }

  draw(ctx) {
    // Which kinds have a body+feet silhouette vs. just a floating head/bug?
    const hasBody = (this.kind !== 'fly');
    // Shooter is a turret — body but no foot animation. Bomber freezes once
    // the fuse starts. Everyone else animates with t.
    const isMoving = hasBody
      && this.kind !== 'shooter'
      && !(this.kind === 'bomber' && this.fuseStarted);

    // Drop shadow under the enemy so they sit on the floor properly.
    // Body-having enemies cast their shadow at the feet; flies cast it
    // right under their hover position.
    // Champion aura — pulsing ring just outside the silhouette so champion
    // enemies are instantly readable. Drawn under the shadow so the body
    // sits on top of the glow.
    if (this.champion) {
      const auraColor = {
        gold:  'rgba(255, 215, 80, 0.55)',
        red:   'rgba(255, 60, 60, 0.55)',
        black: 'rgba(120, 60, 200, 0.55)',
        green: 'rgba(120, 220, 100, 0.55)',
      }[this.champion] || 'rgba(255,255,255,0.5)';
      const pulse = 1 + 0.18 * Math.sin(this.t * 6);
      ctx.fillStyle = auraColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, (this.r + 6) * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    const shadowY = hasBody ? this.y + this.r * 1.65 : this.y + this.r * 0.95;
    const shadowRx = hasBody ? this.r * 1.00 : this.r * 0.95;
    ctx.ellipse(this.x, shadowY, shadowRx, this.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hit flash overrides body color for a few frames after taking damage.
    const flashing = this.hitFlash > 0;
    const tSeed = twitchSeed(this.seed);

    // Body + feet beneath the head, if this kind has one.
    if (hasBody && !flashing) {
      drawCreatureBody(ctx, this.x, this.y, this.r, {
        bodyColor: this.color,
        outline: '#0c0508',
        footColor: '#0a0508',
        moving: isMoving,
        phase: this.t * 9,
        seed: this.seed,
      });
    }

    // Wobbly hand-drawn head (the main hit-target).
    ctx.fillStyle = flashing ? C.COLOR_HIT_FLASH : this.color;
    pathWobblyCircle(ctx, this.x, this.y, this.r, tSeed);
    ctx.fill();

    // Underbelly shadow (clipped to head) — chunky 2-tone shading.
    if (!flashing) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(20, 8, 14, 0.30)';
      ctx.fillRect(this.x - this.r, this.y + this.r * 0.1, this.r * 2, this.r);
      ctx.restore();
    }

    // Thick ink outline.
    ctx.strokeStyle = '#0c0508';
    ctx.lineWidth = 2.6;
    pathWobblyCircle(ctx, this.x, this.y, this.r, tSeed);
    ctx.stroke();

    if (flashing) return; // hide details during flash so the flash reads cleanly

    // Per-kind detail layer — gives each enemy a readable silhouette.
    if (this.kind === 'walker' || this.kind === 'splitter') {
      // Eye sockets fixed in a horizontal layout on the face (front view);
      // the pupil shifts toward the player so the gaze tracks without the
      // whole head rotating top-down.
      const eyeOff = this.r * 0.45;
      const eyeR = [this.r * 0.30, this.r * 0.26];
      let i = 0;
      for (const sign of [-1, 1]) {
        const ox = this.x + sign * eyeOff * 0.70;
        const oy = this.y - eyeOff * 0.10;
        ctx.fillStyle = '#f4e8cf';
        ctx.beginPath();
        ctx.arc(ox, oy, eyeR[i], 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0c0508';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Pupil — small, panicked, shifted toward the player.
        ctx.fillStyle = '#0a0508';
        ctx.beginPath();
        ctx.arc(ox + this.faceX * eyeR[i] * 0.45,
                oy + this.faceY * eyeR[i] * 0.45,
                eyeR[i] * 0.45, 0, Math.PI * 2);
        ctx.fill();
        i++;
      }
      if (this.kind === 'splitter') {
        // Asymmetric stitched seam — telegraphs "this one splits".
        ctx.strokeStyle = '#0c0508';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        const top = this.y - this.r * 0.85;
        const bot = this.y + this.r * 0.85;
        ctx.moveTo(this.x - 1, top);
        ctx.lineTo(this.x + 2, this.y - this.r * 0.4);
        ctx.lineTo(this.x - 1, this.y);
        ctx.lineTo(this.x + 2, this.y + this.r * 0.4);
        ctx.lineTo(this.x - 1, bot);
        ctx.stroke();
        // Stitch hashes across the seam.
        ctx.lineWidth = 1.6;
        for (let k = -2; k <= 2; k++) {
          const sy = this.y + k * this.r * 0.35;
          ctx.beginPath();
          ctx.moveTo(this.x - 4, sy);
          ctx.lineTo(this.x + 4, sy);
          ctx.stroke();
        }
      }
    } else if (this.kind === 'shooter') {
      // Big single cyclops eye, pulsing core inside. Drooling slightly.
      const pulse = 0.55 + 0.30 * Math.sin(this.t * 6);
      ctx.fillStyle = '#f4e8cf';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0c0508';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Vertically-oriented pupil for "reptilian turret" feel.
      ctx.fillStyle = '#0a0508';
      ctx.beginPath();
      ctx.ellipse(this.x + this.faceX * this.r * 0.18, this.y + this.faceY * this.r * 0.18,
                  this.r * 0.14, this.r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pulsing glow.
      ctx.fillStyle = `rgba(255, 120, 200, ${pulse * 0.55})`;
      ctx.beginPath();
      ctx.arc(this.x + this.faceX * this.r * 0.18, this.y + this.faceY * this.r * 0.18, this.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Drool drip beneath.
      ctx.fillStyle = 'rgba(180, 80, 140, 0.65)';
      ctx.beginPath();
      ctx.arc(this.x + 4, this.y + this.r * 0.7, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === 'fly') {
      // Tiny buzzing thing — two flapping wing arcs + one beady eye.
      const flap = Math.sin(this.t * 28);
      ctx.strokeStyle = '#0c0508';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(this.x - this.r * 0.5, this.y - this.r * 0.3, this.r * 0.6, this.r * 0.25 + flap * 0.6, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(this.x + this.r * 0.5, this.y - this.r * 0.3, this.r * 0.6, this.r * 0.25 + flap * 0.6, 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f4e8cf';
      ctx.beginPath();
      ctx.arc(this.x + this.faceX * this.r * 0.2, this.y + this.faceY * this.r * 0.2, this.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0508';
      ctx.beginPath();
      ctx.arc(this.x + this.faceX * this.r * 0.30, this.y + this.faceY * this.r * 0.30, this.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === 'bomber') {
      // Round bomb with a smoking fuse. Body flashes red while fuse ticks.
      if (this.fuseStarted) {
        const flash = (Math.floor(this.t * 14) % 2 === 0);
        if (flash) {
          ctx.fillStyle = 'rgba(255, 60, 60, 0.55)';
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r * 1.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Fuse stalk
      ctx.strokeStyle = '#8a6a40';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.r);
      ctx.lineTo(this.x + 4, this.y - this.r - 6);
      ctx.stroke();
      // Spark
      if (this.fuseStarted) {
        ctx.fillStyle = '#ffd87a';
        ctx.beginPath();
        ctx.arc(this.x + 4, this.y - this.r - 6, 2.4 + Math.random() * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // X-eyes for that "doomed cartoon bomb" feel.
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.8;
      for (const sign of [-1, 1]) {
        const ex = this.x + sign * this.r * 0.35;
        const ey = this.y - this.r * 0.1;
        ctx.beginPath();
        ctx.moveTo(ex - 3, ey - 3); ctx.lineTo(ex + 3, ey + 3);
        ctx.moveTo(ex + 3, ey - 3); ctx.lineTo(ex - 3, ey + 3);
        ctx.stroke();
      }
    } else if (this.kind === 'spitter') {
      // Squat with a forward-facing horn that drips. One angry eye.
      const ex = this.faceX, ey = this.faceY;
      const perpX = -ey, perpY = ex;
      const tip = this.r * 1.05;
      const baseSize = this.r * 0.45;
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath();
      ctx.moveTo(this.x + ex * tip, this.y + ey * tip);
      ctx.lineTo(this.x + perpX * baseSize, this.y + perpY * baseSize);
      ctx.lineTo(this.x - perpX * baseSize, this.y - perpY * baseSize);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0c0508';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Eye behind the horn.
      ctx.fillStyle = '#f4e8cf';
      ctx.beginPath();
      ctx.arc(this.x - ex * this.r * 0.25, this.y - ey * this.r * 0.25, this.r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0c0508';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#0a0508';
      ctx.beginPath();
      ctx.arc(this.x - ex * this.r * 0.18, this.y - ey * this.r * 0.18, this.r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // Drool drip from the horn.
      ctx.fillStyle = 'rgba(120, 200, 90, 0.7)';
      ctx.beginPath();
      ctx.arc(this.x + ex * tip * 0.6, this.y + ey * tip * 0.6 + 3, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === 'charger') {
      // A bony spike protruding in dash direction. Brighter while wound up.
      const tip = this.dashing ? this.r * 1.35 : this.r * 0.98;
      ctx.fillStyle = this.dashing ? '#fff0c0' : '#a87830';
      const px = this.x + this.faceX * tip;
      const py = this.y + this.faceY * tip;
      const perpX = -this.faceY, perpY = this.faceX;
      const baseSize = this.r * 0.55;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(this.x + perpX * baseSize, this.y + perpY * baseSize);
      ctx.lineTo(this.x - perpX * baseSize, this.y - perpY * baseSize);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0c0508';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Two eyes flanking the spike — eyeless charger but with sockets.
      for (const sign of [-1, 1]) {
        const ox = this.x + perpX * this.r * 0.55 * sign - this.faceX * this.r * 0.25;
        const oy = this.y + perpY * this.r * 0.55 * sign - this.faceY * this.r * 0.25;
        ctx.fillStyle = '#0a0508';
        ctx.beginPath();
        ctx.arc(ox, oy, this.r * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// --- Behaviors ---------------------------------------------------------------
// Each function takes (self, dt, room, player, projectiles) and mutates `self`.

Enemy.behaviors = {
  walker(self, dt, room, player) {
    // Beeline at the player.
    const dx = player.x - self.x;
    const dy = player.y - self.y;
    const d = Math.hypot(dx, dy) || 1;
    self.x += (dx / d) * self.speed * dt;
    self.y += (dy / d) * self.speed * dt;
  },

  shooter(self, dt, room, player, projectiles) {
    // Stand still, fire aimed shots on a timer.
    self.fireT -= dt;
    if (self.fireT <= 0) {
      const dx = player.x - self.x;
      const dy = player.y - self.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = C.ENEMY_BULLET_SPEED;
      projectiles.push(new Projectile(
        self.x, self.y, (dx / d) * speed, (dy / d) * speed, 'enemy'
      ));
      self.fireT = 1.4;
    }
  },

  charger(self, dt, room, player) {
    // Pause, then dash in a straight line for a short time.
    if (!self.dashing) {
      self.dashT -= dt;
      if (self.dashT <= 0) {
        const dx = player.x - self.x;
        const dy = player.y - self.y;
        const d = Math.hypot(dx, dy) || 1;
        self.dashVx = (dx / d) * 320;
        self.dashVy = (dy / d) * 320;
        self.dashing = true;
        self.dashT = 0.45; // dash duration
      }
    } else {
      self.x += self.dashVx * dt;
      self.y += self.dashVy * dt;
      self.dashT -= dt;
      if (self.dashT <= 0) {
        self.dashing = false;
        self.dashT = 0.9; // wind-up before next dash
      }
    }
  },

  splitter(self, dt, room, player) {
    // Slow walker; the interesting bit is in onDeath().
    Enemy.behaviors.walker(self, dt, room, player);
  },

  // Buzzes around erratically, drifting toward the player. Low HP, low damage —
  // dangerous in groups because they're hard to track.
  fly(self, dt, room, player) {
    if (self.flyAngle == null) {
      self.flyAngle = Math.random() * Math.PI * 2;
      self.flyChangeT = 0;
    }
    self.flyChangeT -= dt;
    if (self.flyChangeT <= 0) {
      self.flyAngle += (Math.random() - 0.5) * 1.6;
      self.flyChangeT = 0.16 + Math.random() * 0.22;
    }
    // Subtle steer toward the player so flies eventually find you.
    const dxp = player.x - self.x, dyp = player.y - self.y;
    const targetAngle = Math.atan2(dyp, dxp);
    let dA = ((targetAngle - self.flyAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    self.flyAngle += dA * 0.06;
    self.x += Math.cos(self.flyAngle) * self.speed * dt;
    self.y += Math.sin(self.flyAngle) * self.speed * dt;
  },

  // Walks toward the player; once close, the fuse starts and after a beat
  // it self-destructs in a ring of bullets.
  bomber(self, dt, room, player, projectiles) {
    const dxp = player.x - self.x, dyp = player.y - self.y;
    const d = Math.hypot(dxp, dyp) || 1;
    if (!self.fuseStarted) {
      self.x += (dxp / d) * self.speed * dt;
      self.y += (dyp / d) * self.speed * dt;
      if (d < 100) { self.fuseStarted = true; self.fuseT = 0.85; }
    } else {
      // Creeps inward while fizzing — pressure on the player to back off.
      self.x += (dxp / d) * self.speed * 0.35 * dt;
      self.y += (dyp / d) * self.speed * 0.35 * dt;
      self.fuseT -= dt;
      if (self.fuseT <= 0) {
        const speed = C.ENEMY_BULLET_SPEED * 0.85;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          projectiles.push(new Projectile(
            self.x, self.y, Math.cos(a) * speed, Math.sin(a) * speed, 'enemy'
          ));
        }
        self.dead = true;
      }
    }
  },

  // Holds preferred distance from the player and lobs a slow 3-shot spread.
  spitter(self, dt, room, player, projectiles) {
    const dxp = player.x - self.x, dyp = player.y - self.y;
    const d = Math.hypot(dxp, dyp) || 1;
    const ideal = 200;
    if (d > ideal + 30) {
      self.x += (dxp / d) * self.speed * dt;
      self.y += (dyp / d) * self.speed * dt;
    } else if (d < ideal - 30) {
      self.x -= (dxp / d) * self.speed * 0.6 * dt;
      self.y -= (dyp / d) * self.speed * 0.6 * dt;
    }
    self.fireT -= dt;
    if (self.fireT <= 0) {
      const speed = C.ENEMY_BULLET_SPEED * 0.85;
      const base = Math.atan2(dyp, dxp);
      for (const dA of [-0.22, 0, 0.22]) {
        const a = base + dA;
        projectiles.push(new Projectile(
          self.x, self.y, Math.cos(a) * speed, Math.sin(a) * speed, 'enemy'
        ));
      }
      self.fireT = 1.7;
    }
  },
};

// ~10% chance an enemy spawns as a BoI-style champion: stronger, bigger,
// tinted, and guaranteed to drop a useful pickup. Bosses skip this. Some kinds
// (fly, bomber) skip it too because their thing is being numerous/explosive
// and a buffed version doesn't fit the role.
function maybeChampionify(e) {
  if (e.kind === 'fly' || e.kind === 'bomber') return e;
  if (Math.random() >= 0.10) return e;
  const kinds = ['gold', 'red', 'black', 'green'];
  e.champion = kinds[Math.floor(Math.random() * kinds.length)];
  e.hp = Math.ceil(e.hp * 1.6);
  e.r = Math.round(e.r * 1.15);
  e.speed *= 1.15;
  if (e.champion === 'red') {
    e.contactDamage = (e.contactDamage || 1) + 1;
    e.speed *= 1.1;
  }
  if (e.champion === 'gold') {
    // Gold champions have a slight saturation/tint applied to the body color.
    e.color = '#e8c060';
  }
  return e;
}

// Convenience constructor for the standard enemy presets used by rooms / floors.
// Colors come from the active theme so each floor's enemies fit the palette.
function makeEnemy(kind, x, y, floorIdx) {
  const scale = 1 + floorIdx * 0.12;
  const theme = (typeof getTheme === 'function') ? getTheme(floorIdx) : null;
  const colors = (theme && theme.enemyColors) || {
    walker: '#c7544a', shooter: '#9a4ec7', charger: '#e0a64a', splitter: '#8ad06a',
    fly: '#3a3050', bomber: '#1a1018', spitter: '#6ab040',
  };
  // Fall back gracefully if the theme didn't define a color for a new kind.
  const colorFor = (k, fallback) => colors[k] || fallback;
  // Radii bumped ~30% from the original so enemies feel chunkier, matching
  // BoI's closer-camera scale. Champion check at the end so any kind can be
  // promoted to a rare buffed variant.
  let e;
  switch (kind) {
    case 'walker':   e = new Enemy(x, y, 'walker',   { hp: Math.ceil(2 * scale), speed: 80,  color: colors.walker,   radius: 18 }); break;
    case 'shooter':  e = new Enemy(x, y, 'shooter',  { hp: Math.ceil(2 * scale), speed: 0,   color: colors.shooter,  radius: 18 }); break;
    case 'charger':  e = new Enemy(x, y, 'charger',  { hp: Math.ceil(2 * scale), speed: 0,   color: colors.charger,  radius: 19 }); break;
    case 'splitter': e = new Enemy(x, y, 'splitter', { hp: Math.ceil(2 * scale), speed: 55,  color: colors.splitter, radius: 23 }); break;
    case 'fly':      e = new Enemy(x, y, 'fly',      { hp: 1,                    speed: 160, color: colorFor('fly', '#3a3050'),     radius: 11, contactDamage: 1 }); break;
    case 'bomber':   e = new Enemy(x, y, 'bomber',   { hp: Math.ceil(2 * scale), speed: 70,  color: colorFor('bomber', '#1a1018'),  radius: 17, contactDamage: 1 }); break;
    case 'spitter':  e = new Enemy(x, y, 'spitter',  { hp: Math.ceil(2 * scale), speed: 50,  color: colorFor('spitter', '#6ab040'), radius: 18, contactDamage: 1, fireT: 1.2 }); break;
    default: throw new Error('unknown enemy: ' + kind);
  }
  return maybeChampionify(e);
}
