// floors.js — random floor generator.
// Each floor is a random chain of 2-4 enemy rooms between Start and Boss, with
// a Treasure room branching off a random enemy room. Theme + boss are still
// tied to floorIdx so the difficulty curve stays predictable, but the room
// graph and door directions reroll every run.

function buildFloor(floorIdx) {
  // Per-floor enemy palette: which enemy kinds show up, and how many per room.
  // Floors get progressively meaner.
  const palettes = [
    // Floor 1 — gentle intro. Walkers only.
    { kinds: ['walker'], perRoom: 3 },
    // Floor 2 — add shooters.
    { kinds: ['walker', 'shooter'], perRoom: 4 },
    // Floor 3 — add chargers.
    { kinds: ['walker', 'shooter', 'charger'], perRoom: 4 },
    // Floor 4 — add splitters and bigger groups.
    { kinds: ['walker', 'shooter', 'charger', 'splitter'], perRoom: 5 },
    // Floor 5 — full kit, packed rooms.
    { kinds: ['walker', 'shooter', 'charger', 'splitter'], perRoom: 6 },
  ];
  const palette = palettes[floorIdx];
  const bossKinds = ['slime', 'sentinel', 'hunter', 'conjurer', 'warden'];

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

  // 1) Start room — random outbound direction.
  const startOutDir = pickDir([]);
  const start = new Room({ id: nextId++, kind: 'start', doors: [startOutDir], enemySpawns: [] });
  start.cleared = true;
  start.openDoors();
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
    rooms.push(e);
    prevRoom.doors[prevOutDir].target = e.id;
    e.doors[inDir].target = prevRoom.id;
    prevRoom = e;
    prevOutDir = outDir;
  }

  // 3) Boss room.
  const bossInDir = opp[prevOutDir];
  const boss = new Room({
    id: nextId++, kind: 'boss', doors: [bossInDir], bossKind: bossKinds[floorIdx],
  });
  rooms.push(boss);
  prevRoom.doors[prevOutDir].target = boss.id;
  boss.doors[bossInDir].target = prevRoom.id;

  // 4) Treasure branch off a random enemy room with a free direction.
  const enemyRooms = rooms.filter(r => r.kind === 'enemy');
  // Try each enemy room in random order until we find one with a free side.
  const order = enemyRooms.slice().sort(() => Math.random() - 0.5);
  for (const candidate of order) {
    const used = Object.keys(candidate.doors);
    const free = dirs.filter(d => !used.includes(d));
    if (free.length === 0) continue;
    const branchDir = free[Math.floor(Math.random() * free.length)];
    candidate.doors[branchDir] = { target: null, opened: false };

    const treasInDir = opp[branchDir];
    const treas = new Room({
      id: nextId++, kind: 'treasure', doors: [treasInDir], enemySpawns: [],
    });
    treas.cleared = true;
    treas.openDoors();
    rooms.push(treas);
    candidate.doors[branchDir].target = treas.id;
    treas.doors[treasInDir].target = candidate.id;
    // Treasure side stays locked until the candidate enemy room is cleared,
    // which the normal openDoors() flow will handle.
    break;
  }

  return {
    rooms,
    startId: 0,
    bossKind: bossKinds[floorIdx],
    floorIdx,
  };
}
