// items.js — 15 collectibles for treasure rooms.
// Each item is a small object with an id, name, description, color (for the
// pedestal sprite), and an `apply` function that mutates the player.
//
// I sorted them roughly: passive stat boosts, fire-pattern changers, and
// defensive/utility. Mixing categories in a single run is what makes runs feel
// different — picking three pure damage items isn't as fun as Twin Shot +
// Piercing + Vampire.

const ITEMS = [
  // --- Stat boosts -----------------------------------------------------
  {
    id: 'heart_container',
    name: 'Heart Container',
    desc: '+1 max heart, full heal',
    color: '#ff5a6f',
    apply(p) { p.maxHp += 2; p.hp = p.maxHp; },
  },
  {
    id: 'quick_feet',
    name: 'Quick Feet',
    desc: '+25% movement speed',
    color: '#9adfff',
    apply(p) { p.speed *= 1.25; },
  },
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    desc: 'Longer invulnerability after a hit',
    color: '#bcbcd0',
    apply(p) { p.iframesMax += 500; },
  },
  {
    id: 'sharp_tooth',
    name: 'Sharp Tooth',
    desc: '+1 bullet damage',
    color: '#f0e68c',
    apply(p) { p.bulletDamage += 1; },
  },
  {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    desc: '-30% fire cooldown',
    color: '#ff9a4a',
    apply(p) { p.fireCooldownMs *= 0.7; },
  },
  {
    id: 'long_range',
    name: 'Long Range',
    desc: '+30% bullet speed',
    color: '#7af0c8',
    apply(p) { p.bulletSpeed *= 1.3; p.bulletTtlMs *= 1.2; },
  },
  {
    id: 'big_bullets',
    name: 'Big Bullets',
    desc: 'Bullets are bigger and easier to land',
    color: '#fff7c2',
    apply(p) { p.bulletRadius += 4; },
  },
  {
    id: 'vampire',
    name: 'Vampire',
    desc: 'Heal half a heart every 5 kills',
    color: '#a83048',
    apply(p) { p.vampireKillsNeeded = 5; p.vampireKills = 0; },
  },

  // --- Fire-pattern changers ------------------------------------------
  {
    id: 'twin_shot',
    name: 'Twin Shot',
    desc: 'Fire two parallel bullets',
    color: '#c89aff',
    apply(p) {
      // Spread overrides Twin if the player happens to grab both — Spread is
      // the stronger pattern, so let it win to avoid silently nerfing a pickup.
      if (p.shotPattern !== 'spread') p.shotPattern = 'twin';
    },
  },
  {
    id: 'spread_shot',
    name: 'Spread Shot',
    desc: 'Fire three bullets in a cone',
    color: '#ffb86b',
    apply(p) { p.shotPattern = 'spread'; },
  },
  {
    id: 'piercing',
    name: 'Piercing Shot',
    desc: 'Bullets pass through enemies',
    color: '#fffac0',
    apply(p) { p.bulletPiercing = true; },
  },
  {
    id: 'homing',
    name: 'Homing Drift',
    desc: 'Bullets curve toward enemies',
    color: '#9aff9a',
    apply(p) { p.bulletHoming = true; },
  },
  {
    id: 'bouncing',
    name: 'Bouncing Bullets',
    desc: 'Bullets bounce off walls once',
    color: '#a0c8ff',
    apply(p) { p.bulletBouncing = true; },
  },

  // --- Defensive / utility --------------------------------------------
  {
    id: 'soul_heart',
    name: 'Soul Heart',
    desc: 'Adds an extra hit (no max HP gain)',
    color: '#e0e0ff',
    apply(p) { p.soulHearts += 1; },
  },
  {
    id: 'shrink',
    name: 'Shrink Ray',
    desc: 'Smaller body, harder to hit',
    color: '#80f0d0',
    apply(p) { p.r = Math.max(8, p.r - 4); },
  },
];

// Pick a random item the player hasn't picked up yet this run. If they've
// somehow grabbed all 15 (good for them), give a random one anyway.
function pickRandomItem(excludedIds) {
  const pool = ITEMS.filter(it => !excludedIds.includes(it.id));
  const list = pool.length > 0 ? pool : ITEMS;
  return list[Math.floor(Math.random() * list.length)];
}

function findItemById(id) {
  return ITEMS.find(it => it.id === id);
}
