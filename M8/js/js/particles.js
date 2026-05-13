// particles.js — tiny visual flecks on bullet hits.
// Pure cosmetic; particles don't affect gameplay so they live in their own pool.

class Particle {
  constructor(x, y, vx, vy, color, ttlMs, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.ttl = ttlMs;
    this.maxTtl = ttlMs;
    this.size = size;
    this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Drag so they slow down instead of flying off forever.
    this.vx *= 0.92;
    this.vy *= 0.92;
    this.ttl -= dt * 1000;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx) {
    const alpha = Math.max(0, this.ttl / this.maxTtl);
    // Hex color + appended alpha hex (0..255) — keeps things simple.
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// Burst of n flecks at a hit point. Direction is roughly opposite the bullet.
function spawnHitBurst(particles, x, y, baseColor) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 120;
    particles.push(new Particle(
      x, y,
      Math.cos(a) * speed, Math.sin(a) * speed,
      baseColor,
      220 + Math.random() * 180,
      2 + Math.random() * 2
    ));
  }
}

// Chunky blood burst when something dies. Bigger, redder, longer-lived than
// the bullet-hit burst — sells the "death animation explodes into gore" feel.
function spawnGoreBurst(particles, x, y, opts = {}) {
  const big = !!opts.big;
  const n = big ? 24 : 14;
  const colors = ['#8a1010', '#c81818', '#5a0a0a', '#a81414'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = (big ? 140 : 100) + Math.random() * (big ? 220 : 160);
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(
      x, y,
      Math.cos(a) * speed, Math.sin(a) * speed,
      color,
      (big ? 600 : 420) + Math.random() * 300,
      (big ? 4 : 3) + Math.random() * (big ? 5 : 4)
    ));
  }
}
