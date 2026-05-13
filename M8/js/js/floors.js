// floors.js — random floor generator.
// Each floor is a random chain of 2-4 enemy rooms between Start and Boss, with
// a Treasure room branching off a random enemy room. Theme + boss are still
// tied to floorIdx so the difficulty curve stays predictable, but the room
// graph and door directions reroll every run.

function buildFloor(floorIdx, bossKindOverride) {
  // Per-floor enemy palette: which enemy kinds show up, and how many per room.
  // Floors get progressively meaner — new enemies are introduced gradually so
  // the player can learn each one before the next shows up.
  const palettes = [
    // Floor 1 — gentle intro. Walkers + a few flies.
    { kinds: ['walker', 'walker', 'walker', 'fly'], perRoom: 3 },
    // Floor 2 — add shooters and more flies.
    { kinds: ['walker', 'shooter', 'fly'], perRoom: 4 },
    // Floor 3 — chargers and spitters join.
    { kinds: ['walker', 'shooter', 'charger', 'spitter', 'fly'], perRoom: 4 },
    // Floor 4 — splitters and bombers appear; bigger groups.
    { kinds: ['walker', 'shooter', 'charger', 'splitter', 'bomber', 'spitter'], perRoom: 5 },
    // Floor 5 — full kit, packed rooms.
    { kinds: ['walker', 'shooter', 'charger', 'splitter', 'bomber', 'spitter', 'fly'], perRoom: 6 },
  ];
  const palette = palettes[floorIdx];
  // Boss is picked by the run (random per tier) and passed in. Fall back to a
  // sensible default if buildFloor was called without an override.
  const bossKind = bossKindOverride
    || (typeof pickBossForFloor === 'function' ? pickBossForFloor(floorIdx) : 'slime');

  // Helper: scatter `n` enemies in a room, away from the doors and center.
  function scatter(n) {
    const spawns = [];
    const margin = 90;
    for (let i = 0; i < n; i++) {
      const x = C.ROOM_PAD + margin + Math.random() * (C.CANVAS_W - 2 * (C.ROOM_PAD + margin));
      const y = C.HUD_H + C.ROOM_PAD + margin + Math.random() * (C.CANVAS_H - C.HUD_H - 2 * (C.ROOM_PAD + margin));
      const kind = palette.kinds[Math.floor(Math.random() * palette.kinds.length)];
      spawns.push({ kind, x, y });
    }
    return spawns;
  }

  // --- Random layout ---
  // Backbone: Start -> N enemy rooms -> Boss. N rerolls each floor.
  // Treasure room branches off a random enemy room in some unused direction.
  // Door direction at each link is chosen randomly (excluding the one we
  // just came from, so we don't double-up doors).
  const enemyCount = 2 + Math.floor(Math.random() * 3); // 2..4
  const dirs = ['n', 's', 'e', 'w'];
  const opp = { n: 's', s: 'n', e: 'w', w: 'e' };
  const pickDir = (excluded) => {
    const pool = dirs.filter(d => !excluded.includes(d));
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const rooms = [];
  let nextId = 0;

  // Grid offsets per door direction — used to assign room coordinates so the
  // minimap can lay rooms out spatially.
  const delta = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

  // 1) Start room — random outbound direction.
  const startOutDir = pickDir([]);
  const start = new Room({ id: nextId++, kind: 'start', doors: [startOutDir], enemySpawns: [] });
  start.cleared = true;
  start.openDoors();
  start.gridX = 0; start.gridY = 0;
  rooms.push(start);

  // 2) Build the enemy chain.
  let prevRoom = start;
  let prevOutDir = startOutDir;
  for (let i = 0; i < enemyCount; i++) {
    const inDir = opp[prevOutDir];
    const outDir = pickDir([inDir]);
    const isLast = i === enemyCount - 1;
    // Last enemy room gets an extra enemy because it's the gate before boss.
    const e = new Room({
      id: nextId++,
      kind: 'enemy',
      doors: [inDir, outDir],
      enemySpawns: scatter(palette.perRoom + (isLast ? 1 : 0)),
    });
    // Scatter rocks + poop. Rock count scales with depth; poop is rarer.
    if (typeof scatterObstaclesInto === 'function') {
      const rocks = 1 + Math.floor(Math.random() * 3);    // 1..3
      const poops = Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 2) : 0; // 0..2
      scatterObstaclesInto(e, rocks, poops);
    }
    const [dxg, dyg] = delta[prevOutDir];
    e.gridX = prevRoom.gridX + dxg;
    e.gridY = prevRoom.gridY + dyg;
    rooms.push(e);
    prevRoom.doors[prevOutDir].target = e.id;
    e.doors[inDir].target = prevRoom.id;
    prevRoom = e;
    prevOutDir = outDir;
  }

  // 3) Boss room.
  const bossInDir = opp[prevOutDir];
  const boss = new Room({
    id: nextId++, kind: 'boss', doors: [bossInDir], bossKind,
  });
  const [bdx, bdy] = delta[prevOutDir];
  boss.gridX = prevRoom.gridX + bdx;
  boss.gridY = prevRoom.gridY + bdy;
  rooms.push(boss);
  prevRoom.doors[prevOutDir].target = boss.id;
  boss.doors[bossInDir].target = prevRoom.id;

  // 4 & 5) Treasure + shop branches.
  // Guaranteed to spawn on every floor: try enemy rooms first (BoI-style),
  // then fall back to the start room, then the boss room if needed. With our
  // tiny chains, the worst case still has at least one free side somewhere.
  function branchSpecialRoom(kindStr) {
    const enemyRooms = rooms.filter(r => r.kind === 'enemy');
    const fallback = [start];                  // start almost always has 3 free dirs
    const candidates = enemyRooms
      .slice()
      .sort(() => Math.random() - 0.5)
      .concat(fallback);
    for (const candidate of candidates) {
      const used = Object.keys(candidate.doors);
      const free = dirs.filter(d => !used.includes(d));
      if (free.length === 0) continue;
      const branchDir = free[Math.floor(Math.random() * free.length)];
      candidate.doors[branchDir] = { target: null, opened: false };

      const inDirNew = opp[branchDir];
      const room = new Room({
        id: nextId++, kind: kindStr, doors: [inDirNew], enemySpawns: [],
      });
      room.cleared = true;
      room.openDoors();
      const [dxg, dyg] = delta[branchDir];
      room.gridX = candidate.gridX + dxg;
      room.gridY = candidate.gridY + dyg;
      rooms.push(room);
      candidate.doors[branchDir].target = room.id;
      room.doors[inDirNew].target = candidate.id;
      return room;
    }
    return null; // exhaustively impossible with current chain sizes
  }

  // Treasure first (so it gets the prime branch), then shop.
  const treasureRoom = branchSpecialRoom('treasure');
  // Lock the inbound door from the parent room into the treasure room.
  // The treasure-side door (return path) stays unlocked so the player can
  // always leave after grabbing the loot.
  if (treasureRoom) {
    for (const r of rooms) {
      for (const dir in r.doors) {
        const door = r.doors[dir];
        if (door.target === treasureRoom.id && r.kind !== 'treasure') {
          door.locked = true;
        }
      }
    }
  }

  const shop = branchSpecialRoom('shop');
  if (shop) {
    // Four slots laid out horizontally — added a key slot so shops can sell
    // the resource that gates treasure rooms.
    const cy = (shop.top + shop.bottom) / 2;
    const cx = (shop.left + shop.right) / 2;
    const gap = 90;
    const itemDef = pickRandomItem([]);
    shop.shopSlots = [
      { x: cx - gap * 1.5, y: cy, kind: 'heart', cost: 3,  taken: false },
      { x: cx - gap * 0.5, y: cy, kind: 'bomb',  cost: 5,  taken: false },
      { x: cx + gap * 0.5, y: cy, kind: 'key',   cost: 4,  taken: false },
      { x: cx + gap * 1.5, y: cy, kind: 'item',  cost: 15, taken: false, itemId: itemDef.id },
    ];
  }

  // Stamp each door with the kind of its target room so room.draw() can pick
  // door visuals — boss doors look bloody, treasure doors look gilded, etc.
  for (const r of rooms) {
    for (const dir in r.doors) {
      const targetId = r.doors[dir].target;
      if (targetId == null) continue;
      const target = rooms.find(x => x.id === targetId);
      if (target) r.doors[dir].targetKind = target.kind;
    }
  }

  return {
    rooms,
    startId: 0,
    bossKind,
    floorIdx,
  };
}
