// pickups.js — coins, hearts, and bomb pickups that drop from enemies.
// Stored on the current room so they persist across re-entries.

class Pickup {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind;             // 'coin' | 'nickel' | 'dime' | 'heart' | 'bomb' | 'key' | 'soulheart' | 'pill'
    this.r = (kind === 'coin') ? 7 : (kind === 'key' ? 8 : (kind === 'dime' ? 8 : (kind === 'pill' ? 7 : 9)));
    // Per-pill random color pair so each pill on the floor looks unique.
    if (kind === 'pill') {
      const palette = ['#ff5060', '#60a0ff', '#80d060', '#f0c038', '#c890ff', '#f0a0c0', '#d0d0e0', '#404040', '#ff9050', '#80f0d0'];
      this.pillTop = palette[Math.floor(Math.random() * palette.length)];
      do { this.pillBot = palette[Math.floor(Math.random() * palette.length)]; } while (this.pillBot === this.pillTop);
    }
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
    if (this.kind === 'coin')   { player.coins = (player.coins | 0) + 1;        return true; }
    if (this.kind === 'nickel') { player.coins = (player.coins | 0) + 5;        return true; }
    if (this.kind === 'dime')   { player.coins = (player.coins | 0) + 10;       return true; }
    if (this.kind === 'bomb')   { player.bombs = Math.min(player.maxBombs || 9, (player.bombs | 0) + 1); return true; }
    if (this.kind === 'key')    { player.keys  = Math.min(player.maxKeys  || 99, (player.keys  | 0) + 1); return true; }
    if (this.kind === 'soulheart') { player.soulHearts += 1; return true; }
    if (this.kind === 'heart') {
      if (player.hp >= player.maxHp) return false; // full HP — don't waste it
      player.heal(2);
      return true;
    }
    if (this.kind === 'pill') {
      // Mystery pill: roll one of a small effect table and apply it. The
      // pickup-toast caller (game.js) surfaces the result through this.pillMessage.
      this.pillMessage = rollPillEffect(player);
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
    } else if (this.kind === 'nickel') {
      // Silver nickel — bigger, brighter than a penny, no ¢ glyph.
      ctx.fillStyle = '#c0c8d0';
      pathWobblyCircle(ctx, this.x, this.y + bob, this.r, this.seed);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.8;
      pathWobblyCircle(ctx, this.x, this.y + bob, this.r, this.seed);
      ctx.stroke();
      ctx.fillStyle = '#e8ecf0';
      ctx.beginPath();
      ctx.arc(this.x - 1, this.y + bob - 1, this.r * 0.40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0508';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('5', this.x, this.y + bob + 1);
    } else if (this.kind === 'dime') {
      // Gold dime — bigger gold coin with a bright glow ring.
      const glow = 0.4 + 0.2 * Math.sin(this.t * 1.8);
      ctx.fillStyle = `rgba(255, 230, 120, ${glow})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y + bob, this.r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0c038';
      pathWobblyCircle(ctx, this.x, this.y + bob, this.r, this.seed);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.8;
      pathWobblyCircle(ctx, this.x, this.y + bob, this.r, this.seed);
      ctx.stroke();
      ctx.fillStyle = '#fff0a8';
      ctx.beginPath();
      ctx.arc(this.x - 1, this.y + bob - 1, this.r * 0.40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0508';
      ctx.font = 'bold 9px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('10', this.x, this.y + bob + 1);
    } else if (this.kind === 'soulheart') {
      // Soul heart — pale blue heart, the BoI extra-hit pickup.
      const w = this.r * 2.2, h = this.r * 2.2;
      ctx.save();
      ctx.translate(this.x - w / 2, this.y + bob - h / 2);
      ctx.fillStyle = '#c0d8ff';
      UI.heartPath(ctx, 0, 0, w, h);
      ctx.fill();
      ctx.strokeStyle = '#0a0306';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(w * 0.32, h * 0.32, w * 0.10, h * 0.08, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.kind === 'pill') {
      // Two-tone capsule, slightly tilted, per-instance colors.
      const cyP = this.y + bob;
      ctx.save();
      ctx.translate(this.x, cyP);
      ctx.rotate(-0.35);
      // top half
      ctx.fillStyle = this.pillTop;
      ctx.beginPath();
      ctx.arc(-3, 0, 5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.lineTo(3, -5);
      ctx.lineTo(3, 5);
      ctx.closePath();
      ctx.fill();
      // bottom half
      ctx.fillStyle = this.pillBot;
      ctx.beginPath();
      ctx.arc(3, 0, 5, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.lineTo(-3, 5);
      ctx.lineTo(-3, -5);
      ctx.closePath();
      ctx.fill();
      // outline
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-3, -5);
      ctx.arc(-3, 0, 5, Math.PI * 1.5, Math.PI * 0.5, true);
      ctx.lineTo(3, 5);
      ctx.arc(3, 0, 5, Math.PI * 0.5, Math.PI * 1.5, true);
      ctx.closePath();
      ctx.stroke();
      // shine pip
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(-2, -2, 2.5, 1.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.kind === 'key') {
      // Small brass key — bow (round head) + shaft + two teeth.
      const cy = this.y + bob;
      // Bow (the round head).
      ctx.fillStyle = '#e0b840';
      ctx.beginPath();
      ctx.arc(this.x - this.r * 0.35, cy, this.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Inner hole in the bow.
      ctx.fillStyle = '#1a1018';
      ctx.beginPath();
      ctx.arc(this.x - this.r * 0.35, cy, this.r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // Shaft.
      ctx.fillStyle = '#e0b840';
      ctx.fillRect(this.x - this.r * 0.05, cy - 1.6, this.r * 0.95, 3.2);
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(this.x - this.r * 0.05, cy - 1.6, this.r * 0.95, 3.2);
      // Two teeth at the tip.
      ctx.fillStyle = '#e0b840';
      ctx.fillRect(this.x + this.r * 0.55, cy + 0.5, 3, 3);
      ctx.fillRect(this.x + this.r * 0.80, cy + 0.5, 2.5, 2.2);
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
  // Total drop chance ~46% (luck-scaled). Coins lean toward pennies but can
  // occasionally roll into nickels or dimes for that BoI jackpot moment.
  const dimeChance   = 0.01 * luckBoost;
  const nickelChance = 0.03 * luckBoost;
  const coinChance   = 0.26 * luckBoost;
  const bombChance   = 0.05 * luckBoost;
  const keyChance    = 0.06 * luckBoost;
  const heartChance  = 0.04 * luckBoost;
  const pillChance   = 0.02 * luckBoost;
  let acc = 0;
  if (r < (acc += dimeChance))   return new Pickup(x, y, 'dime');
  if (r < (acc += nickelChance)) return new Pickup(x, y, 'nickel');
  if (r < (acc += coinChance))   return new Pickup(x, y, 'coin');
  if (r < (acc += bombChance))   return new Pickup(x, y, 'bomb');
  if (r < (acc += keyChance))    return new Pickup(x, y, 'key');
  if (r < (acc += heartChance))  return new Pickup(x, y, 'heart');
  if (r < (acc += pillChance))   return new Pickup(x, y, 'pill');
  return null;
}

// Guaranteed champion-kill drop based on the champion variant.
function championDrop(championKind, x, y) {
  if (championKind === 'gold')  return new Pickup(x, y, 'dime');
  if (championKind === 'red')   return new Pickup(x, y, 'heart');
  if (championKind === 'black') return new Pickup(x, y, 'soulheart');
  if (championKind === 'green') return new Pickup(x, y, 'bomb');
  return new Pickup(x, y, 'coin');
}

// Roll a random pill effect, apply it to the player, return a short message
// to surface via the pickup toast. Effects are a mix of buffs, curses, and
// utility — same vibe as BoI pills where you take your chances.
function rollPillEffect(player) {
  const effects = [
    { msg: 'Health Up!',     fn: p => { p.maxHp += 2; p.hp = p.maxHp; } },
    { msg: 'Health Down!',   fn: p => { p.maxHp = Math.max(2, p.maxHp - 2); if (p.hp > p.maxHp) p.hp = p.maxHp; } },
    { msg: 'Speed Up!',      fn: p => { p.speed *= 1.15; } },
    { msg: 'Speed Down!',    fn: p => { p.speed *= 0.90; } },
    { msg: 'Tears Up!',      fn: p => { p.fireCooldownMs *= 0.88; } },
    { msg: 'Tears Down!',    fn: p => { p.fireCooldownMs *= 1.15; } },
    { msg: 'Range Up!',      fn: p => { p.bulletTtlMs *= 1.25; p.bulletSpeed *= 1.05; } },
    { msg: 'Full Health',    fn: p => { p.hp = p.maxHp; } },
    { msg: 'Bad Trip',       fn: p => { p.hp = Math.max(1, p.hp - 2); } },
    { msg: 'Bombs are Key',  fn: p => { p.bombs = Math.min(p.maxBombs || 9, p.bombs + 2); p.keys = Math.min(p.maxKeys || 99, p.keys + 2); } },
    { msg: 'Lucky!',         fn: p => { p.luckBoost = (p.luckBoost || 1) * 1.25; } },
    { msg: 'Pretty Fly',     fn: p => { p.soulHearts += 1; } },
  ];
  const pick = effects[Math.floor(Math.random() * effects.length)];
  pick.fn(player);
  return pick.msg;
}
