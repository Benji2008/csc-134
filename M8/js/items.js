// items.js — collectibles for treasure rooms.
// Each item is a small object with an id, name, description, color (for the
// pedestal glow), an `apply` function that mutates the player, and an `icon`
// function that draws the BoI-style sprite on the pedestal.
//
// Mixing item categories in a single run is what makes runs feel different —
// picking three pure damage items isn't as fun as Twin Shot + Piercing +
// Vampire.

// --- Icon helpers ----------------------------------------------------------
// Tiny BoI-style sprites drawn centered around (x, y), ~22-24px footprint.
// Sharing helpers keeps the dozens of items visually consistent while still
// letting each item have its own silhouette.
const iconHelpers = {
  heart(ctx, x, y, fill = '#ff5a6f', shineColor = 'rgba(255,255,255,0.7)') {
    const w = 22, h = 20;
    ctx.save();
    ctx.translate(x - w / 2, y - h / 2 + 1);
    ctx.fillStyle = fill;
    if (typeof UI !== 'undefined' && UI.heartPath) {
      UI.heartPath(ctx, 0, 0, w, h);
    } else {
      ctx.beginPath();
      ctx.arc(w * 0.30, h * 0.32, w * 0.30, 0, Math.PI * 2);
      ctx.arc(w * 0.70, h * 0.32, w * 0.30, 0, Math.PI * 2);
      ctx.moveTo(0, h * 0.40);
      ctx.lineTo(w * 0.5, h);
      ctx.lineTo(w, h * 0.40);
      ctx.closePath();
    }
    ctx.fill();
    ctx.strokeStyle = '#0a0306';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = shineColor;
    ctx.beginPath();
    ctx.ellipse(w * 0.32, h * 0.30, 2.4, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  skull(ctx, x, y, fill = '#e8e0d0') {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y - 1, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 6);
    ctx.lineTo(x - 4, y + 10);
    ctx.lineTo(x + 4, y + 10);
    ctx.lineTo(x + 6, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0a0508';
    ctx.beginPath();
    ctx.arc(x - 3.5, y - 1, 2.2, 0, Math.PI * 2);
    ctx.arc(x + 3.5, y - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x - 1.4, y + 5);
    ctx.lineTo(x + 1.4, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 8);
    ctx.lineTo(x + 4, y + 8);
    ctx.stroke();
  },

  eye(ctx, x, y, iris = '#a83048', size = 11) {
    ctx.fillStyle = '#f8eed8';
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0d10';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0508';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x - size * 0.20, y - size * 0.30, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
  },

  bomb(ctx, x, y, body = '#0a0508', spark = '#ffd84a') {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y + 1, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1018';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(180,180,200,0.5)';
    ctx.beginPath();
    ctx.arc(x - 3, y - 2, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a40';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + 4, y - 14);
    ctx.stroke();
    ctx.fillStyle = spark;
    ctx.beginPath();
    ctx.arc(x + 4, y - 14, 2.4, 0, Math.PI * 2);
    ctx.fill();
  },

  pill(ctx, x, y, top = '#ff9aa0', bot = '#f8eed8') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.4);
    const r = 6, len = 14;
    ctx.beginPath();
    ctx.arc(-len / 2, 0, r, Math.PI / 2, -Math.PI / 2, false);
    ctx.lineTo(0, -r);
    ctx.lineTo(0, r);
    ctx.closePath();
    ctx.fillStyle = top;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(len / 2, 0, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(0, r);
    ctx.lineTo(0, -r);
    ctx.closePath();
    ctx.fillStyle = bot;
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.arc(-len / 2, 0, r, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(0, r);
    ctx.arc(len / 2, 0, r, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(-len / 2, -2, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  halo(ctx, x, y, color = '#fff0a0') {
    ctx.fillStyle = 'rgba(255,240,160,0.40)';
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#a89020';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  foot(ctx, x, y, color = '#f0d8b0') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0d10';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const tx = x - 4 + i * 2;
      const ty = y - 8;
      const tr = 1.4 - Math.abs(i - 2) * 0.18;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(tx, ty, tr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  },

  boot(ctx, x, y, color = '#3878c8') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 9);
    ctx.lineTo(x + 2, y - 9);
    ctx.lineTo(x + 2, y + 4);
    ctx.lineTo(x + 9, y + 4);
    ctx.lineTo(x + 9, y + 9);
    ctx.lineTo(x - 4, y + 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#1a1018';
    ctx.fillRect(x - 4, y + 7, 13, 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 6); ctx.lineTo(x + 1, y - 6);
    ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 1, y - 3);
    ctx.stroke();
  },

  tooth(ctx, x, y, color = '#f8f0c8') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 8);
    ctx.quadraticCurveTo(x - 8, y - 4, x - 4, y + 4);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x + 4, y + 4);
    ctx.quadraticCurveTo(x + 8, y - 4, x + 7, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x - 4, y - 6, 1.6, 7);
  },

  coin(ctx, x, y, color = '#f0c038', text = '$') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a4a10';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#a87818';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#6a4a10';
    ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  },

  shield(ctx, x, y, color = '#bcbcd0', spikes = false) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 9, y - 6);
    ctx.lineTo(x + 8, y + 4);
    ctx.lineTo(x, y + 11);
    ctx.lineTo(x - 8, y + 4);
    ctx.lineTo(x - 9, y - 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1018';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#5a5060';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x, y + 7);
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.stroke();
    if (spikes) {
      ctx.fillStyle = '#9098a8';
      ctx.strokeStyle = '#1a1018';
      ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 4 - 1.6, y - 9);
        ctx.lineTo(x + i * 4, y - 14);
        ctx.lineTo(x + i * 4 + 1.6, y - 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  },

  magnet(ctx, x, y, color = '#b03038') {
    // U-shaped horseshoe magnet
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 8);
    ctx.lineTo(x - 4, y - 8);
    ctx.lineTo(x - 4, y + 3);
    ctx.arc(x, y + 3, 4, Math.PI, 0, true);
    ctx.lineTo(x + 4, y - 8);
    ctx.lineTo(x + 9, y - 8);
    ctx.lineTo(x + 9, y + 3);
    ctx.arc(x, y + 3, 9, 0, Math.PI, false);
    ctx.lineTo(x - 9, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Steel tips on top.
    ctx.fillStyle = '#d8d0c0';
    ctx.fillRect(x - 9, y - 11, 5, 3);
    ctx.fillRect(x + 4, y - 11, 5, 3);
    ctx.strokeRect(x - 9, y - 11, 5, 3);
    ctx.strokeRect(x + 4, y - 11, 5, 3);
  },

  bullets(ctx, x, y, color = '#fff7c2', count = 1, big = false) {
    const positions = count === 2 ? [-5, 5]
                    : count === 3 ? [-7, 0, 7]
                    : count === 4 ? [-9, -3, 3, 9]
                    : [0];
    const w = big ? 5 : 3, h = big ? 9 : 6;
    for (const dx of positions) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x + dx, y - 2, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Trail.
      ctx.fillStyle = 'rgba(140, 200, 235, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x + dx, y + h, w * 0.7, h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  spider(ctx, x, y, color = '#5a3a4a') {
    // Legs first, body on top.
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const yl = y - 4 + (i / 3) * 8;
      ctx.beginPath();
      ctx.moveTo(x - 4, yl);
      ctx.quadraticCurveTo(x - 10, yl - 2, x - 12, yl + 4);
      ctx.moveTo(x + 4, yl);
      ctx.quadraticCurveTo(x + 10, yl - 2, x + 12, yl + 4);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 3, y - 1, 1.3, 0, Math.PI * 2);
    ctx.arc(x - 1, y - 3, 1.0, 0, Math.PI * 2);
    ctx.arc(x + 1, y - 3, 1.0, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 1, 1.3, 0, Math.PI * 2);
    ctx.fill();
  },

  flask(ctx, x, y, color = '#a0e0c0') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 9);
    ctx.lineTo(x + 3, y - 9);
    ctx.lineTo(x + 3, y - 2);
    ctx.lineTo(x + 9, y + 9);
    ctx.lineTo(x - 9, y + 9);
    ctx.lineTo(x - 3, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#7a5430';
    ctx.fillRect(x - 4, y - 11, 8, 2);
    ctx.strokeRect(x - 4, y - 11, 8, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(x - 3, y + 3, 1.4, 0, Math.PI * 2);
    ctx.arc(x + 2, y + 6, 1.6, 0, Math.PI * 2);
    ctx.arc(x - 1, y + 7, 1.0, 0, Math.PI * 2);
    ctx.fill();
  },

  spoon(ctx, x, y, color = '#b08858') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.55);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(-1.5, 0, 3, 11);
    ctx.strokeRect(-1.5, 0, 3, 11);
    ctx.restore();
  },

  // Cross — for sacred/lamb items.
  cross(ctx, x, y, color = '#ffd8a8') {
    ctx.fillStyle = color;
    ctx.fillRect(x - 2, y - 9, 4, 18);
    ctx.fillRect(x - 7, y - 3, 14, 4);
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x - 2, y - 9, 4, 18);
    ctx.strokeRect(x - 7, y - 3, 14, 4);
  },

  // Fallback orb (the old style).
  orb(ctx, x, y, color = '#fff', seed = 7) {
    ctx.fillStyle = color;
    pathWobblyCircle(ctx, x, y, 11, seed);
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 2.4;
    pathWobblyCircle(ctx, x, y, 11, seed);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  },
};

const ITEMS = [
  // --- Stat boosts -----------------------------------------------------
  {
    id: 'heart_container',
    name: 'Heart Container',
    desc: '+1 max heart, full heal',
    color: '#ff5a6f',
    apply(p) { p.maxHp += 2; p.hp = p.maxHp; },
    icon(ctx, x, y) { iconHelpers.heart(ctx, x, y, '#ff5a6f'); },
  },
  {
    id: 'quick_feet',
    name: 'Quick Feet',
    desc: '+25% movement speed',
    color: '#9adfff',
    apply(p) { p.speed *= 1.25; },
    icon(ctx, x, y) { iconHelpers.foot(ctx, x, y, '#9adfff'); },
  },
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    desc: 'Longer invulnerability after a hit',
    color: '#bcbcd0',
    apply(p) { p.iframesMax += 500; },
    icon(ctx, x, y) { iconHelpers.shield(ctx, x, y, '#bcbcd0'); },
  },
  {
    id: 'sharp_tooth',
    name: 'Sharp Tooth',
    desc: '+1 bullet damage',
    color: '#f0e68c',
    apply(p) { p.bulletDamage += 1; },
    icon(ctx, x, y) { iconHelpers.tooth(ctx, x, y, '#f8f0c8'); },
  },
  {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    desc: '-30% fire cooldown',
    color: '#ff9a4a',
    apply(p) { p.fireCooldownMs *= 0.7; },
    icon(ctx, x, y) { iconHelpers.bullets(ctx, x, y, '#ff9a4a', 3); },
  },
  {
    id: 'long_range',
    name: 'Long Range',
    desc: '+30% bullet speed',
    color: '#7af0c8',
    apply(p) { p.bulletSpeed *= 1.3; p.bulletTtlMs *= 1.2; },
    icon(ctx, x, y) { iconHelpers.bullets(ctx, x, y, '#7af0c8', 1, true); },
  },
  {
    id: 'big_bullets',
    name: 'Big Bullets',
    desc: 'Bullets are bigger and easier to land',
    color: '#fff7c2',
    apply(p) { p.bulletRadius += 4; },
    icon(ctx, x, y) { iconHelpers.bullets(ctx, x, y, '#fff7c2', 1, true); },
  },
  {
    id: 'vampire',
    name: 'Vampire',
    desc: 'Heal half a heart every 5 kills',
    color: '#a83048',
    apply(p) { p.vampireKillsNeeded = 5; p.vampireKills = 0; },
    icon(ctx, x, y) {
      iconHelpers.heart(ctx, x, y, '#7a1828');
      // Fangs hanging off the bottom of the heart.
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#0a0306';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 5); ctx.lineTo(x - 3, y + 10); ctx.lineTo(x - 1, y + 5);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 5); ctx.lineTo(x + 3, y + 10); ctx.lineTo(x + 5, y + 5);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    },
  },

  // --- Fire-pattern changers ------------------------------------------
  {
    id: 'twin_shot',
    name: 'Twin Shot',
    desc: 'Fire two parallel bullets',
    color: '#c89aff',
    apply(p) {
      if (p.shotPattern !== 'spread') p.shotPattern = 'twin';
    },
    icon(ctx, x, y) { iconHelpers.bullets(ctx, x, y, '#c89aff', 2); },
  },
  {
    id: 'spread_shot',
    name: 'Spread Shot',
    desc: 'Fire three bullets in a cone',
    color: '#ffb86b',
    apply(p) { p.shotPattern = 'spread'; },
    icon(ctx, x, y) { iconHelpers.bullets(ctx, x, y, '#ffb86b', 3); },
  },
  {
    id: 'piercing',
    name: 'Piercing Shot',
    desc: 'Bullets pass through enemies',
    color: '#fffac0',
    apply(p) { p.bulletPiercing = true; },
    icon(ctx, x, y) {
      iconHelpers.bullets(ctx, x, y - 2, '#fffac0', 1, true);
      // Skewered ring suggesting "through".
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x, y + 4, 7, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
  {
    id: 'homing',
    name: 'Homing Drift',
    desc: 'Bullets curve toward enemies',
    color: '#9aff9a',
    apply(p) { p.bulletHoming = true; },
    icon(ctx, x, y) {
      iconHelpers.bullets(ctx, x, y, '#9aff9a', 1, true);
      // Curve arrow indicating tracking.
      ctx.strokeStyle = '#9aff9a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 4, y + 2, 7, -Math.PI * 0.2, Math.PI * 0.7);
      ctx.stroke();
    },
  },
  {
    id: 'bouncing',
    name: 'Bouncing Bullets',
    desc: 'Bullets bounce off walls once',
    color: '#a0c8ff',
    apply(p) { p.bulletBouncing = true; },
    icon(ctx, x, y) {
      iconHelpers.bullets(ctx, x - 5, y - 3, '#a0c8ff', 1);
      // Bounce arc from the bullet hitting an implied wall.
      ctx.strokeStyle = '#a0c8ff';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(x + 2, y + 4, 8, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // --- Defensive / utility --------------------------------------------
  {
    id: 'soul_heart',
    name: 'Soul Heart',
    desc: 'Adds an extra hit (no max HP gain)',
    color: '#e0e0ff',
    apply(p) { p.soulHearts += 1; },
    icon(ctx, x, y) { iconHelpers.heart(ctx, x, y, '#c8c8ff'); },
  },
  {
    id: 'shrink',
    name: 'Shrink Ray',
    desc: 'Smaller body, harder to hit',
    color: '#80f0d0',
    apply(p) { p.r = Math.max(8, p.r - 4); },
    icon(ctx, x, y) { iconHelpers.flask(ctx, x, y, '#80f0d0'); },
  },

  // --- Stat trades + new-system interactions ----------------------------
  {
    id: 'cursed_skull',
    name: 'Cursed Skull',
    desc: '+2 damage, but lose 1 heart container',
    color: '#d8d0c0',
    apply(p) {
      p.bulletDamage += 2;
      p.maxHp = Math.max(2, p.maxHp - 2);
      if (p.hp > p.maxHp) p.hp = p.maxHp;
    },
    icon(ctx, x, y) { iconHelpers.skull(ctx, x, y, '#d8d0c0'); },
  },
  {
    id: 'lucky_foot',
    name: "Lucky Foot",
    desc: '+50% drop chance from enemies',
    color: '#f0c890',
    apply(p) { p.luckBoost = (p.luckBoost || 1.0) * 1.5; },
    icon(ctx, x, y) { iconHelpers.foot(ctx, x, y, '#f0c890'); },
  },
  {
    id: 'magnet',
    name: 'Magnet',
    desc: 'Coins and pickups fly toward you',
    color: '#b0a0d8',
    apply(p) { p.pickupMagnet = true; },
    icon(ctx, x, y) { iconHelpers.magnet(ctx, x, y, '#b03038'); },
  },
  {
    id: 'big_step',
    name: 'Big Step',
    desc: 'Diagonals are no longer slowed',
    color: '#80c8ff',
    apply(p) { p.fastDiagonal = true; },
    icon(ctx, x, y) { iconHelpers.boot(ctx, x, y, '#80c8ff'); },
  },
  {
    id: 'sacred_heart',
    name: 'Sacred Heart',
    desc: '+1 max heart, piercing bullets, full heal',
    color: '#ffd8a8',
    apply(p) {
      p.maxHp += 2;
      p.hp = p.maxHp;
      p.bulletPiercing = true;
    },
    icon(ctx, x, y) {
      iconHelpers.halo(ctx, x, y - 11, '#fff0a0');
      iconHelpers.heart(ctx, x, y + 2, '#ffd8a8');
    },
  },
  {
    id: 'cursed_eye',
    name: 'Cursed Eye',
    desc: '+30% fire rate, slightly slower bullets',
    color: '#a040a0',
    apply(p) {
      p.fireCooldownMs *= 0.7;
      p.bulletSpeed *= 0.9;
    },
    icon(ctx, x, y) { iconHelpers.eye(ctx, x, y, '#a040a0'); },
  },
  {
    id: 'mystery_pill',
    name: 'Mystery Pill',
    desc: 'A random stat boost (or curse)',
    color: '#90d8ff',
    apply(p) {
      const rolls = [
        () => p.maxHp += 2,
        () => p.speed *= 1.15,
        () => p.bulletDamage += 1,
        () => p.fireCooldownMs *= 0.85,
        () => p.bulletSpeed *= 1.15,
        () => p.r = Math.max(8, p.r - 2),
        () => { p.speed *= 0.9; p.bulletDamage += 1; },
        () => p.coins = (p.coins | 0) + 6,
      ];
      rolls[Math.floor(Math.random() * rolls.length)]();
      if (p.hp > p.maxHp) p.hp = p.maxHp;
    },
    icon(ctx, x, y) { iconHelpers.pill(ctx, x, y, '#90d8ff', '#f8eed8'); },
  },
  {
    id: 'brittle_bones',
    name: 'Brittle Bones',
    desc: '+1 damage, but shorter i-frames',
    color: '#e8e0c8',
    apply(p) {
      p.bulletDamage += 1;
      p.iframesMax = Math.max(300, p.iframesMax - 250);
    },
    icon(ctx, x, y) {
      iconHelpers.skull(ctx, x, y, '#e8e0c8');
      // Crack line across the cranium.
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 5);
      ctx.lineTo(x - 3, y - 2);
      ctx.lineTo(x, y - 4);
      ctx.lineTo(x + 5, y - 1);
      ctx.stroke();
    },
  },
  {
    id: 'wooden_spoon',
    name: 'Wooden Spoon',
    desc: '+15% speed, +1 damage',
    color: '#b08858',
    apply(p) {
      p.speed *= 1.15;
      p.bulletDamage += 1;
    },
    icon(ctx, x, y) { iconHelpers.spoon(ctx, x, y, '#b08858'); },
  },
  {
    id: 'halo',
    name: 'Halo',
    desc: 'Heal half a heart on entering a new room',
    color: '#fff0a0',
    apply(p) { p.haloHeal = true; },
    icon(ctx, x, y) { iconHelpers.halo(ctx, x, y, '#fff0a0'); },
  },
  {
    id: 'pyromaniac',
    name: 'Pyromaniac',
    desc: 'Start with +3 bombs and a bigger blast',
    color: '#ff8a3a',
    apply(p) {
      p.bombs = Math.min(p.maxBombs || 9, (p.bombs | 0) + 3);
      p.bombBlastBoost = 1.4;
    },
    icon(ctx, x, y) { iconHelpers.bomb(ctx, x, y, '#1a0a08', '#ff8a3a'); },
  },
  {
    id: 'belt_of_holding',
    name: 'Belt of Holding',
    desc: 'Carry up to 18 bombs',
    color: '#7a4a2a',
    apply(p) { p.maxBombs = 18; },
    icon(ctx, x, y) {
      // Leather belt with buckle.
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(x - 11, y - 3, 22, 7);
      ctx.strokeStyle = '#1a0d10';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(x - 11, y - 3, 22, 7);
      // Buckle.
      ctx.fillStyle = '#d8b860';
      ctx.fillRect(x - 4, y - 5, 8, 11);
      ctx.strokeRect(x - 4, y - 5, 8, 11);
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(x - 1, y - 3, 2, 7);
      // Stitching.
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // --- Bonus items (round 2) ------------------------------------------
  {
    id: 'polyphemus',
    name: 'Polyphemus',
    desc: 'Huge slow bullets, big damage',
    color: '#fff0c8',
    apply(p) {
      p.bulletRadius += 6;
      p.bulletDamage += 2;
      p.fireCooldownMs *= 1.35;
      p.bulletSpeed *= 0.85;
    },
    icon(ctx, x, y) { iconHelpers.eye(ctx, x, y, '#c89030', 13); },
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    desc: '+2 damage, but max HP drops to 2 hearts',
    color: '#c0e8ff',
    apply(p) {
      p.bulletDamage += 2;
      p.maxHp = 4;
      if (p.hp > p.maxHp) p.hp = p.maxHp;
    },
    icon(ctx, x, y) {
      iconHelpers.flask(ctx, x, y, '#c0e8ff');
      // Crack across the flask glass.
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 4);
      ctx.lineTo(x - 1, y);
      ctx.lineTo(x + 2, y - 2);
      ctx.lineTo(x + 4, y + 4);
      ctx.stroke();
    },
  },
  {
    id: 'caffeine_rush',
    name: 'Caffeine Rush',
    desc: '+20% speed and +20% fire rate',
    color: '#c89060',
    apply(p) {
      p.speed *= 1.20;
      p.fireCooldownMs *= 0.80;
    },
    icon(ctx, x, y) {
      iconHelpers.flask(ctx, x, y, '#c89060');
      // Steam wisps off the top.
      ctx.strokeStyle = 'rgba(220,220,220,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 12);
      ctx.quadraticCurveTo(x - 6, y - 16, x - 2, y - 19);
      ctx.moveTo(x + 3, y - 12);
      ctx.quadraticCurveTo(x + 6, y - 16, x + 2, y - 19);
      ctx.stroke();
    },
  },
  {
    id: 'wrath_of_the_lamb',
    name: 'Wrath of the Lamb',
    desc: 'Homing bullets and +1 damage',
    color: '#ffb0c0',
    apply(p) { p.bulletHoming = true; p.bulletDamage += 1; },
    icon(ctx, x, y) {
      iconHelpers.cross(ctx, x, y - 1, '#ffb0c0');
      // Tiny droplet at the cross's base.
      ctx.fillStyle = '#c8202a';
      ctx.beginPath();
      ctx.arc(x, y + 11, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a0a0a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    },
  },
  {
    id: 'lucky_penny',
    name: 'Lucky Penny',
    desc: 'Instant +8 coins and a small luck boost',
    color: '#f0c038',
    apply(p) {
      p.coins = (p.coins | 0) + 8;
      p.luckBoost = (p.luckBoost || 1.0) * 1.2;
    },
    icon(ctx, x, y) { iconHelpers.coin(ctx, x, y, '#f0c038', '$'); },
  },
  {
    id: 'fly_swatter',
    name: 'Fly Swatter',
    desc: '+50% damage vs small foes (and flies hate you less)',
    color: '#90d090',
    apply(p) {
      p.bulletDamage += 1;
      p.bulletBouncing = true;
    },
    icon(ctx, x, y) {
      // Mesh paddle + handle.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.4);
      ctx.fillStyle = '#90d090';
      ctx.beginPath();
      ctx.ellipse(0, -3, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Mesh.
      ctx.strokeStyle = '#3a4a2a';
      ctx.lineWidth = 0.7;
      for (let i = -6; i <= 6; i += 3) {
        ctx.beginPath();
        ctx.moveTo(i, -10);
        ctx.lineTo(i, 4);
        ctx.moveTo(-8, i - 3);
        ctx.lineTo(8, i - 3);
        ctx.stroke();
      }
      // Handle.
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(-1.5, 4, 3, 11);
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-1.5, 4, 3, 11);
      ctx.restore();
    },
  },

  // --- Bonus items (round 3) ------------------------------------------
  {
    id: 'soy_milk',
    name: 'Soy Milk',
    desc: 'Tons of bullets, but each one barely tickles',
    color: '#f4ecd6',
    apply(p) {
      p.fireCooldownMs *= 0.4;
      p.bulletDamage = Math.max(1, Math.round(p.bulletDamage * 0.55));
      p.bulletRadius = Math.max(3, p.bulletRadius - 1);
    },
    icon(ctx, x, y) {
      // Milk carton — trapezoid with cap.
      ctx.fillStyle = '#f4ecd6';
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 8);
      ctx.lineTo(x + 6, y - 8);
      ctx.lineTo(x + 7, y + 9);
      ctx.lineTo(x - 7, y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      // Roof crease.
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 8);
      ctx.lineTo(x, y - 11);
      ctx.lineTo(x + 6, y - 8);
      ctx.stroke();
      // SOY label.
      ctx.fillStyle = '#3a4a2a';
      ctx.font = 'bold 7px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SOY', x, y + 2);
    },
  },
  {
    id: 'mutant_spider',
    name: 'Mutant Spider',
    desc: 'Quad-shot spread + a touch more damage',
    color: '#b8e0a0',
    apply(p) {
      p.shotPattern = 'spread';
      p.bulletDamage += 1;
    },
    icon(ctx, x, y) { iconHelpers.spider(ctx, x, y, '#5a8038'); },
  },
  {
    id: 'number_one',
    name: 'Number One',
    desc: 'Tiny fast bullets, short range, blistering fire rate',
    color: '#f0e060',
    apply(p) {
      p.fireCooldownMs *= 0.7;
      p.bulletTtlMs *= 0.75;
      p.bulletRadius = Math.max(3, p.bulletRadius - 2);
    },
    icon(ctx, x, y) { iconHelpers.coin(ctx, x, y, '#f0e060', '1'); },
  },
  {
    id: 'mr_mega',
    name: 'Mr. Mega',
    desc: 'Bigger bombs and +3 to carry',
    color: '#ff6a2a',
    apply(p) {
      p.bombBlastBoost = (p.bombBlastBoost || 1) * 1.6;
      p.bombs = Math.min(p.maxBombs || 9, (p.bombs | 0) + 3);
    },
    icon(ctx, x, y) {
      // Big bomb with an "M" stenciled on the side.
      iconHelpers.bomb(ctx, x, y, '#1a0a08', '#ff6a2a');
      ctx.fillStyle = '#ff6a2a';
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', x, y + 2);
    },
  },
  {
    id: 'the_soul',
    name: 'The Soul',
    desc: '+2 soul hearts',
    color: '#e6e0ff',
    apply(p) { p.soulHearts += 2; },
    icon(ctx, x, y) {
      // Wisp rising off a pale blue heart.
      ctx.strokeStyle = 'rgba(200,200,255,0.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 9);
      ctx.quadraticCurveTo(x - 5, y - 13, x - 1, y - 16);
      ctx.quadraticCurveTo(x + 3, y - 19, x, y - 22);
      ctx.stroke();
      iconHelpers.heart(ctx, x, y + 1, '#c8c8ff');
    },
  },
  {
    id: 'iron_maiden',
    name: 'Iron Maiden',
    desc: 'Much longer i-frames, slightly slower feet',
    color: '#9098a8',
    apply(p) {
      p.iframesMax += 700;
      p.speed *= 0.92;
    },
    icon(ctx, x, y) { iconHelpers.shield(ctx, x, y, '#9098a8', true); },
  },
  {
    id: 'tough_love',
    name: 'Tough Love',
    desc: '+2 damage, slower fire rate',
    color: '#c84858',
    apply(p) {
      p.bulletDamage += 2;
      p.fireCooldownMs *= 1.25;
    },
    icon(ctx, x, y) {
      iconHelpers.heart(ctx, x, y, '#c84858');
      // Arrow piercing the heart, top-left to bottom-right.
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x - 11, y - 9);
      ctx.lineTo(x + 11, y + 7);
      ctx.stroke();
      // Arrowhead.
      ctx.fillStyle = '#3a2418';
      ctx.beginPath();
      ctx.moveTo(x + 11, y + 7);
      ctx.lineTo(x + 7, y + 8);
      ctx.lineTo(x + 9, y + 3);
      ctx.closePath();
      ctx.fill();
      // Fletching.
      ctx.beginPath();
      ctx.moveTo(x - 11, y - 9);
      ctx.lineTo(x - 14, y - 7);
      ctx.lineTo(x - 11, y - 5);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: 'rotten_baby',
    name: 'Rotten Baby',
    desc: 'Bouncing homing bullets — chaos, basically',
    color: '#9aa860',
    apply(p) {
      p.bulletHoming = true;
      p.bulletBouncing = true;
      p.bulletSpeed *= 0.9;
    },
    icon(ctx, x, y) {
      // Sickly green baby head.
      ctx.fillStyle = '#9aa860';
      pathWobblyCircle(ctx, x, y, 10, 31);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 2;
      pathWobblyCircle(ctx, x, y, 10, 31);
      ctx.stroke();
      // Stitched seam down the middle.
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let yy = -7; yy <= 7; yy += 3) {
        ctx.moveTo(x - 1.5, y + yy);
        ctx.lineTo(x + 1.5, y + yy);
      }
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
      // Big sad eyes.
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - 4, y - 1, 2.4, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 1, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0508';
      ctx.beginPath();
      ctx.arc(x - 4, y, 1.2, 0, Math.PI * 2);
      ctx.arc(x + 4, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    },
  },
];

// Pick a random item the player hasn't picked up yet this run. If they've
// somehow grabbed all of them (good for them), give a random one anyway.
function pickRandomItem(excludedIds) {
  const pool = ITEMS.filter(it => !excludedIds.includes(it.id));
  const list = pool.length > 0 ? pool : ITEMS;
  return list[Math.floor(Math.random() * list.length)];
}

function findItemById(id) {
  return ITEMS.find(it => it.id === id);
}
