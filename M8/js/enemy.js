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
        new Enemy(this.x - 14, this.y, 'walker', {
          radius: 11, hp: 1, speed: 90, color: '#d76d8a'
        }),
        new Enemy(this.x + 14, this.y, 'walker', {
          radius: 11, hp: 1, speed: 90, color: '#d76d8a'
        }),
      ];
    }
    return [];
  }

  draw(ctx) {
    // Drop shadow under the enemy so they sit on the floor properly.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.95, this.r * 0.95, this.r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hit flash overrides body color for a few frames after taking damage.
    const flashing = this.hitFlash > 0;
    const tSeed = twitchSeed(this.seed);

    // Wobbly hand-drawn body.
    ctx.fillStyle = flashing ? C.COLOR_HIT_FLASH : this.color;
    pathWobblyCircle(ctx, this.x, this.y, this.r, tSeed);
    ctx.fill();

    // Underbelly shadow (clipped to body) — chunky 2-tone shading.
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
      // Two big eyes facing the player. Slightly asymmetric.
      const ex = this.faceX, ey = this.faceY;
      const eyeOff = this.r * 0.45;
      const perpX = -ey, perpY = ex;
      const eyeR = [this.r * 0.30, this.r * 0.26];
      let i = 0;
      for (const sign of [-1, 1]) {
        const ox = this.x + ex * eyeOff * 0.30 + perpX * sign * eyeOff * 0.70;
        const oy = this.y + ey * eyeOff * 0.30 + perpY * sign * eyeOff * 0.70;
        ctx.fillStyle = '#f4e8cf';
        ctx.beginPath();
        ctx.arc(ox, oy, eyeR[i], 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0c0508';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Pupil — small, panicked, shifted toward look direction.
        ctx.fillStyle = '#0a0508';
        ctx.beginPath();
        ctx.arc(ox + ex * eyeR[i] * 0.4, oy + ey * eyeR[i] * 0.4, eyeR[i] * 0.45, 0, Math.PI * 2);
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
};

// Convenience constructor for the standard enemy presets used by rooms / floors.
// Colors come from the active theme so each floor's enemies fit the palette.
function makeEnemy(kind, x, y, floorIdx) {
  const scale = 1 + floorIdx * 0.12;
  const theme = (typeof getTheme === 'function') ? getTheme(floorIdx) : null;
  const colors = (theme && theme.enemyColors) || {
    walker: '#c7544a', shooter: '#9a4ec7', charger: '#e0a64a', splitter: '#8ad06a',
  };
  switch (kind) {
    case 'walker':   return new Enemy(x, y, 'walker',   { hp: Math.ceil(2 * scale), speed: 80,  color: colors.walker,   radius: 14 });
    case 'shooter':  return new Enemy(x, y, 'shooter',  { hp: Math.ceil(2 * scale), speed: 0,   color: colors.shooter,  radius: 14 });
    case 'charger':  return new Enemy(x, y, 'charger',  { hp: Math.ceil(2 * scale), speed: 0,   color: colors.charger,  radius: 15 });
    case 'splitter': return new Enemy(x, y, 'splitter', { hp: Math.ceil(2 * scale), speed: 55,  color: colors.splitter, radius: 18 });
    default: throw new Error('unknown enemy: ' + kind);
  }
}
