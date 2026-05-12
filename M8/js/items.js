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

  // --- New items: stat trades + new-system interactions ----------------
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
  },
  {
    id: 'lucky_foot',
    name: "Lucky Foot",
    desc: '+50% drop chance from enemies',
    color: '#f0c890',
    apply(p) { p.luckBoost = (p.luckBoost || 1.0) * 1.5; },
  },
  {
    id: 'magnet',
    name: 'Magnet',
    desc: 'Coins and pickups fly toward you',
    color: '#b0a0d8',
    apply(p) { p.pickupMagnet = true; },
  },
  {
    id: 'big_step',
    name: 'Big Step',
    desc: 'Diagonals are no longer slowed',
    color: '#80c8ff',
    apply(p) { p.fastDiagonal = true; },
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
  },
  {
    id: 'halo',
    name: 'Halo',
    desc: 'Heal half a heart on entering a new room',
    color: '#fff0a0',
    apply(p) { p.haloHeal = true; },
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
  },
  {
    id: 'belt_of_holding',
    name: 'Belt of Holding',
    desc: 'Carry up to 18 bombs',
    color: '#7a4a2a',
    apply(p) { p.maxBombs = 18; },
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
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    desc: '+2 damage, but max HP drops to 2 hearts',
    color: '#c0e8ff',
    apply(p) {
      p.bulletDamage += 2;
      p.maxHp = 4; // 2 full hearts
      if (p.hp > p.maxHp) p.hp = p.maxHp;
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
  },
  {
    id: 'wrath_of_the_lamb',
    name: 'Wrath of the Lamb',
    desc: 'Homing bullets and +1 damage',
    color: '#ffb0c0',
    apply(p) { p.bulletHoming = true; p.bulletDamage += 1; },
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
  },
  {
    id: 'fly_swatter',
    name: 'Fly Swatter',
    desc: '+50% damage vs small foes (and flies hate you less)',
    color: '#90d090',
    apply(p) {
      // Bullets gain a small damage bump and a touch of bouncing for crowd control.
      p.bulletDamage += 1;
      p.bulletBouncing = true;
    },
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
