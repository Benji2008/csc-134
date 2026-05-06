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
    // Hit flash overrides body color for a few frames after taking damage.
    const flashing = this.hitFlash > 0;
    ctx.fillStyle = flashing ? C.COLOR_HIT_FLASH : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1620';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (flashing) return; // hide details during flash so the flash reads cleanly

    // Per-kind detail layer — gives each enemy a readable silhouette.
    if (this.kind === 'walker' || this.kind === 'splitter') {
      // Two angry eyes facing the player.
      const ex = this.faceX, ey = this.faceY;
      const eyeOff = this.r * 0.45;
      const perpX = -ey, perpY = ex;
      ctx.fillStyle = '#fff';
      for (const sign of [-1, 1]) {
        const ox = this.x + ex * eyeOff * 0.4 + perpX * sign * eyeOff * 0.6;
        const oy = this.y + ey * eyeOff * 0.4 + perpY * sign * eyeOff * 0.6;
        ctx.beginPath();
        ctx.arc(ox, oy, this.r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1a1620';
      for (const sign of [-1, 1]) {
        const ox = this.x + ex * eyeOff * 0.55 + perpX * sign * eyeOff * 0.6;
        const oy = this.y + ey * eyeOff * 0.55 + perpY * sign * eyeOff * 0.6;
        ctx.beginPath();
        ctx.arc(ox, oy, this.r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.kind === 'splitter') {
        // Crack down the middle so the player can read "this one splits".
        ctx.strokeStyle = '#1a1620';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.r * 0.9);
        ctx.lineTo(this.x, this.y + this.r * 0.9);
        ctx.stroke();
      }
    } else if (this.kind === 'shooter') {
      // Pulsing inner core to look like a turret charging up.
      const pulse = 0.55 + 0.25 * Math.sin(this.t * 6);
      ctx.fillStyle = '#1a1620';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 200, 240, ${pulse})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.kind === 'charger') {
      // A spike pointing in dash direction. Brighter while wound up.
      const tip = this.dashing ? this.r * 1.3 : this.r * 0.95;
      ctx.fillStyle = this.dashing ? '#fff7c2' : '#a36a26';
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
      ctx.strokeStyle = '#1a1620';
      ctx.lineWidth = 1.5;
      ctx.stroke();
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
