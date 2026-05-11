// bombs.js — placeable bombs. Player puts one down, fuse counts, then BOOM.
// Explosion damages enemies/boss + destroys obstacles in radius.

class Bomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 8;
    this.fuse = 1800;   // ms until detonation
    this.dead = false;
    this.exploded = false;
    this.flashT = 0;    // post-explosion flash timer (ms)
    this.blastR = 64;   // damage radius
    this.blastDamage = 8;
    this.seed = Math.random() * 9999;
  }

  update(dt) {
    if (!this.exploded) {
      this.fuse -= dt * 1000;
      if (this.fuse <= 0) {
        this.exploded = true;
        this.flashT = 380;
      }
    } else {
      this.flashT -= dt * 1000;
      if (this.flashT <= 0) this.dead = true;
    }
  }

  draw(ctx) {
    if (!this.exploded) {
      // Drop shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.r * 0.85, this.r * 0.95, this.r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body — blinks red as fuse runs down.
      const flick = Math.floor(performance.now() / Math.max(60, this.fuse / 6)) % 2 === 0;
      ctx.fillStyle = flick ? '#1a0508' : '#0a0508';
      pathWobblyCircle(ctx, this.x, this.y, this.r, this.seed);
      ctx.fill();
      ctx.strokeStyle = '#1a1018';
      ctx.lineWidth = 1.8;
      pathWobblyCircle(ctx, this.x, this.y, this.r, this.seed);
      ctx.stroke();
      // Highlight.
      ctx.fillStyle = 'rgba(160,160,180,0.5)';
      ctx.beginPath();
      ctx.arc(this.x - this.r * 0.35, this.y - this.r * 0.35, this.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      // Fuse with spark.
      ctx.strokeStyle = '#8a6a40';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.r);
      ctx.lineTo(this.x + 4, this.y - this.r - 6);
      ctx.stroke();
      ctx.fillStyle = flick ? '#fff7c2' : '#ff8a3a';
      ctx.beginPath();
      ctx.arc(this.x + 4, this.y - this.r - 6, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Explosion flash + smoke ring.
      const t = 1 - this.flashT / 380;
      const ringR = this.blastR * (0.4 + t * 0.7);
      ctx.fillStyle = `rgba(255, 220, 120, ${0.55 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(80, 30, 10, ${0.7 * (1 - t)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 120, 50, ${0.5 * (1 - t * 0.8)})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Did this bomb just detonate this frame? Used by game loop to apply blast.
  // We treat the moment exploded=true && flashT just dropped from max as the "boom".
  justExploded() {
    return this.exploded && this.flashT >= 340;
  }
}

// Spawn a chunky smoke + ember burst at (x, y) for the explosion visual.
function spawnExplosionParticles(particles, x, y) {
  const colors = ['#ff8a3a', '#ffd84a', '#8a3010', '#3a1a0a', '#c84a18'];
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 220;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(
      x, y,
      Math.cos(a) * speed, Math.sin(a) * speed,
      color,
      400 + Math.random() * 400,
      3 + Math.random() * 5
    ));
  }
}
