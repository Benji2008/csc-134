// bombs.js — placeable bombs. Player puts one down, fuse counts, then BOOM.
// Explosion damages enemies/boss + destroys obstacles in radius.
//
// BoI-isms layered in:
//   • Bombs are physical objects: once the player walks off, they become solid
//     and get kicked when bumped, sliding with friction. Lets you punt a bomb
//     into a crowd or away from yourself.
//   • Final 500ms is a hard strobe so detonation is unmistakable.
//   • Chain detonation: a bomb caught in another bomb's blast immediately arms.

class Bomb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 10;            // slightly bigger so it pushes/reads better
    this.fuse = 1700;       // ms until detonation
    this.dead = false;
    this.exploded = false;
    this.flashT = 0;        // post-explosion flash timer (ms)
    this.blastR = 72;       // damage radius
    this.blastDamage = 8;
    this.seed = Math.random() * 9999;
    // Pushable physics — bombs slide on the floor with friction.
    this.vx = 0;
    this.vy = 0;
    // While the player still overlaps the bomb (right after placement), don't
    // treat it as a solid object. Once they step off, lock that in so any
    // further contact pushes the bomb.
    this.solid = false;
    // Tiny squash on placement for a "drop" feel.
    this.squashT = 180;
  }

  // Force-detonate this bomb on the next frame (used for chain reactions).
  chainIgnite() {
    if (this.exploded) return;
    if (this.fuse > 80) this.fuse = 80;
  }

  update(dt) {
    if (this.squashT > 0) this.squashT -= dt * 1000;
    if (!this.exploded) {
      // Slide with friction.
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const decay = Math.exp(-6 * dt);
      this.vx *= decay;
      this.vy *= decay;
      if (Math.abs(this.vx) < 4) this.vx = 0;
      if (Math.abs(this.vy) < 4) this.vy = 0;

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
      // Final-half-second strobe: alternates very fast and brightens up to
      // near-white. Earlier fuse phase: slower, dim red wink.
      const finalPhase = this.fuse < 500;
      let bodyColor;
      if (finalPhase) {
        const fast = Math.floor(performance.now() / 60) % 2 === 0;
        bodyColor = fast ? '#fff4c2' : '#9a1010';
      } else {
        const flick = Math.floor(performance.now() / Math.max(120, this.fuse / 5)) % 2 === 0;
        bodyColor = flick ? '#1a0508' : '#0a0508';
      }

      // Squash on placement for a thud.
      const sq = this.squashT > 0 ? this.squashT / 180 : 0;
      const sx = 1 + sq * 0.25;
      const sy = 1 - sq * 0.18;

      // Drop shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.r * 0.85, this.r * 0.95 * sx, this.r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body — wobbly silhouette, scaled for squash.
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(sx, sy);
      ctx.fillStyle = bodyColor;
      pathWobblyCircle(ctx, 0, 0, this.r, this.seed);
      ctx.fill();
      ctx.strokeStyle = '#1a1018';
      ctx.lineWidth = 1.8;
      pathWobblyCircle(ctx, 0, 0, this.r, this.seed);
      ctx.stroke();
      // Highlight.
      ctx.fillStyle = 'rgba(160,160,180,0.5)';
      ctx.beginPath();
      ctx.arc(-this.r * 0.35, -this.r * 0.35, this.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Fuse + spark, slightly bigger as the fuse runs out.
      const sparkR = 2.2 + (finalPhase ? 1.6 : 0);
      ctx.strokeStyle = '#8a6a40';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.r);
      ctx.lineTo(this.x + 4, this.y - this.r - 6);
      ctx.stroke();
      ctx.fillStyle = finalPhase ? '#fff7c2' : '#ff8a3a';
      ctx.beginPath();
      ctx.arc(this.x + 4, this.y - this.r - 6, sparkR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Explosion flash + smoke ring. Three layered circles for some depth.
      const t = 1 - this.flashT / 380;
      const ringR = this.blastR * (0.45 + t * 0.75);
      // Bright core
      ctx.fillStyle = `rgba(255, 240, 180, ${0.7 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Mid plume
      ctx.fillStyle = `rgba(255, 130, 50, ${0.55 * (1 - t * 0.9)})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR * 0.85, 0, Math.PI * 2);
      ctx.fill();
      // Smoke ring outline
      ctx.strokeStyle = `rgba(60, 24, 10, ${0.75 * (1 - t)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Spawn a chunky smoke + ember burst at (x, y) for the explosion visual.
function spawnExplosionParticles(particles, x, y) {
  const colors = ['#ff8a3a', '#ffd84a', '#8a3010', '#3a1a0a', '#c84a18', '#1a0d0a'];
  for (let i = 0; i < 36; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 140 + Math.random() * 260;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(
      x, y,
      Math.cos(a) * speed, Math.sin(a) * speed,
      color,
      450 + Math.random() * 500,
      3 + Math.random() * 6
    ));
  }
}
