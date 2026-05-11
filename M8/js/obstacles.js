// obstacles.js — static room obstacles: rocks (indestructible by bullets) and
// poop (breakable by bullets, takes a few hits). Both die to bombs.

class Obstacle {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind;        // 'rock' | 'poop'
    this.r = (kind === 'rock') ? 16 : 14;
    this.hp = (kind === 'rock') ? Infinity : 3;
    this.dead = false;
    this.hitFlash = 0;
    this.seed = Math.random() * 9999;
  }

  takeDamage(amount) {
    if (this.kind === 'rock') return; // bullets can't break rocks
    this.hp -= amount;
    this.hitFlash = C.HIT_FLASH_MS;
    if (this.hp <= 0) this.dead = true;
  }

  // Bombs destroy everything.
  destroyByBomb() {
    this.dead = true;
  }

  update(dt) {
    if (this.hitFlash > 0) this.hitFlash -= dt * 1000;
  }

  draw(ctx) {
    // Drop shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.85, this.r * 0.95, this.r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    const flashing = this.hitFlash > 0;
    if (this.kind === 'rock') {
      // Cracked stone — main lump + 2 smaller lumps clustered.
      const base = flashing ? '#d8d0c0' : '#5a5260';
      const dark = flashing ? '#a8a090' : '#2a242a';
      // small back lump
      ctx.fillStyle = dark;
      pathWobblyCircle(ctx, this.x - this.r * 0.5, this.y - this.r * 0.2, this.r * 0.65, this.seed + 1);
      ctx.fill();
      // main lump
      ctx.fillStyle = base;
      pathWobblyCircle(ctx, this.x, this.y, this.r, this.seed);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 2.4;
      pathWobblyCircle(ctx, this.x, this.y, this.r, this.seed);
      ctx.stroke();
      // small front lump
      ctx.fillStyle = base;
      pathWobblyCircle(ctx, this.x + this.r * 0.55, this.y + this.r * 0.25, this.r * 0.55, this.seed + 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 2;
      pathWobblyCircle(ctx, this.x + this.r * 0.55, this.y + this.r * 0.25, this.r * 0.55, this.seed + 2);
      ctx.stroke();
      // Crack lines.
      ctx.strokeStyle = 'rgba(10,5,8,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(this.x - 4, this.y - this.r * 0.5);
      ctx.lineTo(this.x + 2, this.y);
      ctx.lineTo(this.x - 2, this.y + this.r * 0.3);
      ctx.stroke();
    } else if (this.kind === 'poop') {
      // BoI poop — three stacked brown blobs of decreasing size.
      const c0 = flashing ? '#e0c098' : '#5a3a1a';
      const c1 = flashing ? '#d0b088' : '#6a4a26';
      const c2 = flashing ? '#c0a078' : '#7a5a32';
      // base
      ctx.fillStyle = c0;
      pathWobblyCircle(ctx, this.x, this.y + this.r * 0.4, this.r, this.seed);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 2;
      pathWobblyCircle(ctx, this.x, this.y + this.r * 0.4, this.r, this.seed);
      ctx.stroke();
      // mid
      ctx.fillStyle = c1;
      pathWobblyCircle(ctx, this.x + 1, this.y - 2, this.r * 0.78, this.seed + 1);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 2;
      pathWobblyCircle(ctx, this.x + 1, this.y - 2, this.r * 0.78, this.seed + 1);
      ctx.stroke();
      // top
      ctx.fillStyle = c2;
      pathWobblyCircle(ctx, this.x - 1, this.y - this.r * 0.8, this.r * 0.55, this.seed + 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.6;
      pathWobblyCircle(ctx, this.x - 1, this.y - this.r * 0.8, this.r * 0.55, this.seed + 2);
      ctx.stroke();
      // Stink lines if not flashing.
      if (!flashing) {
        ctx.strokeStyle = 'rgba(150, 200, 80, 0.45)';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
          const sx = this.x - 6 + i * 6;
          const sy = this.y - this.r * 1.3 + Math.sin(performance.now() / 300 + i) * 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + 3, sy - 4, sx, sy - 8);
          ctx.stroke();
        }
      }
    }
  }
}

// Scatter obstacles in a room. Avoids the center and the doors so the player
// always has a clean entry. Returns nothing — mutates room.obstacles.
function scatterObstaclesInto(room, rockCount, poopCount) {
  if (!room.obstacles) room.obstacles = [];
  const margin = 70;
  const tries = (n, kind) => {
    let made = 0, attempts = 0;
    while (made < n && attempts < 40) {
      attempts++;
      const x = room.left + margin + Math.random() * (room.width - 2 * margin);
      const y = room.top + margin + Math.random() * (room.height - 2 * margin);
      // Stay away from the room center (player spawns/walks through it).
      const cx = (room.left + room.right) / 2;
      const cy = (room.top + room.bottom) / 2;
      if (Math.hypot(x - cx, y - cy) < 70) continue;
      // Avoid stacking on existing obstacles.
      let clash = false;
      for (const o of room.obstacles) {
        if (Math.hypot(o.x - x, o.y - y) < o.r + 24) { clash = true; break; }
      }
      if (clash) continue;
      room.obstacles.push(new Obstacle(x, y, kind));
      made++;
    }
  };
  tries(rockCount, 'rock');
  tries(poopCount, 'poop');
}
