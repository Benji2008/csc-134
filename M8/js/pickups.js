// pickups.js — coins, hearts, and bomb pickups that drop from enemies.
// Stored on the current room so they persist across re-entries.

class Pickup {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind;             // 'coin' | 'heart' | 'bomb'
    this.r = (kind === 'coin') ? 7 : 9;
    this.dead = false;
    // Tiny bobbing animation so pickups feel alive on the floor.
    this.t = Math.random() * Math.PI * 2;
    this.seed = Math.random() * 9999;
  }

  update(dt) {
    this.t += dt * 4;
  }

  // Player calls this on contact; returns true if the pickup was consumed.
  applyTo(player) {
    if (this.kind === 'coin')  { player.coins = (player.coins | 0) + 1;        return true; }
    if (this.kind === 'bomb')  { player.bombs = Math.min(player.maxBombs || 9, (player.bombs | 0) + 1); return true; }
    if (this.kind === 'heart') {
      if (player.hp >= player.maxHp) return false; // full HP — don't waste it
      player.heal(2);
      return true;
    }
    return false;
  }

  draw(ctx) {
    const bob = Math.sin(this.t) * 1.5;
    // Drop shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.8, this.r * 0.85, this.r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.kind === 'coin') {
      // Gold coin with sheen.
      ctx.fillStyle = '#c89a30';
      pathWobblyCircle(ctx, this.x, this.y + bob, this.r, this.seed);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.8;
      pathWobblyCircle(ctx, this.x, this.y + bob, this.r, this.seed);
      ctx.stroke();
      // Center mark
      ctx.fillStyle = '#f0d058';
      ctx.beginPath();
      ctx.arc(this.x - 1, this.y + bob - 1, this.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0508';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¢', this.x, this.y + bob + 1);
    } else if (this.kind === 'heart') {
      // Mini lumpy heart — reuse UI heart path so it matches the HUD.
      const w = this.r * 2.2, h = this.r * 2.2;
      ctx.save();
      ctx.translate(this.x - w / 2, this.y + bob - h / 2);
      ctx.fillStyle = '#c81818';
      UI.heartPath(ctx, 0, 0, w, h);
      ctx.fill();
      ctx.strokeStyle = '#0a0306';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,180,180,0.7)';
      ctx.beginPath();
      ctx.ellipse(w * 0.32, h * 0.32, w * 0.10, h * 0.08, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.kind === 'bomb') {
      // Black bomb with a fuse.
      ctx.fillStyle = '#0a0508';
      pathWobblyCircle(ctx, this.x, this.y + bob, this.r, this.seed);
      ctx.fill();
      ctx.strokeStyle = '#1a1018';
      ctx.lineWidth = 1.8;
      pathWobblyCircle(ctx, this.x, this.y + bob, this.r, this.seed);
      ctx.stroke();
      // Tiny highlight
      ctx.fillStyle = 'rgba(180,180,200,0.6)';
      ctx.beginPath();
      ctx.arc(this.x - this.r * 0.35, this.y + bob - this.r * 0.35, this.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      // Fuse
      ctx.strokeStyle = '#8a6a40';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + bob - this.r);
      ctx.lineTo(this.x + 3, this.y + bob - this.r - 5);
      ctx.stroke();
    }
  }
}

// Roll for a drop when an enemy dies. Returns a Pickup or null.
// luckBoost = 1.0 by default; items can raise it.
function rollEnemyDrop(x, y, luckBoost = 1.0) {
  const r = Math.random();
  // Coin ~30%, bomb ~5%, heart ~5%, nothing otherwise — boosted by luck.
  const coinChance  = 0.30 * luckBoost;
  const bombChance  = 0.05 * luckBoost;
  const heartChance = 0.05 * luckBoost;
  if (r < coinChance) return new Pickup(x, y, 'coin');
  if (r < coinChance + bombChance) return new Pickup(x, y, 'bomb');
  if (r < coinChance + bombChance + heartChance) return new Pickup(x, y, 'heart');
  return null;
}
