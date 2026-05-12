// room.js — one screen of play. Holds enemies, doors, and where the player enters.
// A floor is a graph of these connected by their doors.

class Room {
  constructor(opts = {}) {
    // Bounds of the playable area inside the canvas.
    this.left   = C.ROOM_PAD;
    this.right  = C.CANVAS_W - C.ROOM_PAD;
    this.top    = C.HUD_H + C.ROOM_PAD;
    this.bottom = C.CANVAS_H - C.ROOM_PAD;
    this.width  = this.right - this.left;
    this.height = this.bottom - this.top;

    // Doors keyed by direction. Each door points at another room id (set up by Floor).
    // Format: { dir: { target: roomId, opened: false } }
    this.doors = {};
    if (opts.doors) {
      for (const dir of opts.doors) {
        this.doors[dir] = { target: null, opened: false };
      }
    }

    // What to spawn when the player enters. `enemies` is an array of {kind, x, y}.
    this.enemySpawns = opts.enemySpawns ?? [];
    // For boss rooms.
    this.bossKind = opts.bossKind ?? null;
    // The id of this room within its floor — assigned by Floor.
    this.id = opts.id ?? 0;
    // Room kind: 'start' | 'enemy' | 'boss' | 'treasure'
    this.kind = opts.kind ?? 'enemy';
    // Treasure rooms hold one item on a pedestal until picked up.
    this.itemId = opts.itemId ?? null;
    this.itemTaken = false;

    this.cleared = this.enemySpawns.length === 0 && this.bossKind == null;

    // Persistent floor decals — blood splats left by enemy/boss kills.
    // Each entry: { x, y, blobs: [{ox,oy,r}], hasCenter }. Capped to keep redraw cheap.
    this.decals = [];
    // Static grime is generated lazily on first draw (seeded by room id).
    this.grime = null;

    // Shop slots — only populated for kind==='shop'. Each slot has:
    //   { x, y, kind: 'heart'|'bomb'|'item', cost, itemId, taken }
    this.shopSlots = null;

    // Grid coordinates used by the minimap. Assigned by buildFloor() as it
    // walks the room graph.
    this.gridX = 0;
    this.gridY = 0;
    // Has the player ever stood in this room? Used by the minimap.
    this.visited = false;
  }

  // Drop a chunky multi-blob blood splat at (x,y). Called by the game loop
  // whenever an enemy or boss dies in this room.
  addBloodSplat(x, y, opts = {}) {
    const blobCount = opts.big ? 7 : (4 + Math.floor(Math.random() * 3));
    const spread = opts.big ? 32 : 22;
    const baseR = opts.big ? 5 : 3;
    const blobs = [];
    for (let i = 0; i < blobCount; i++) {
      blobs.push({
        ox: (Math.random() - 0.5) * spread,
        oy: (Math.random() - 0.5) * spread,
        r: baseR + Math.random() * (opts.big ? 7 : 6),
      });
    }
    this.decals.push({ x, y, blobs });
    // Cap so a long room doesn't accumulate hundreds of decals.
    if (this.decals.length > 36) this.decals.shift();
  }

  // Visual rectangle of the door, drawn straddling the wall.
  doorRect(dir) {
    const cx = (this.left + this.right) / 2;
    const cy = (this.top + this.bottom) / 2;
    if (dir === 'n') return { x: cx - C.DOOR_W / 2, y: this.top - C.DOOR_H / 2,    w: C.DOOR_W, h: C.DOOR_H };
    if (dir === 's') return { x: cx - C.DOOR_W / 2, y: this.bottom - C.DOOR_H / 2, w: C.DOOR_W, h: C.DOOR_H };
    if (dir === 'w') return { x: this.left  - C.DOOR_H / 2, y: cy - C.DOOR_W / 2,  w: C.DOOR_H, h: C.DOOR_W };
    if (dir === 'e') return { x: this.right - C.DOOR_H / 2, y: cy - C.DOOR_W / 2,  w: C.DOOR_H, h: C.DOOR_W };
    return null;
  }

  // Trigger zone for walking through an open door. Lives INSIDE the room so
  // the player (whose center is clamped to >= room.left + r etc.) can actually
  // reach it. The visual doorRect straddles the wall, which the player center
  // could never enter — that was the original "doors don't work" bug.
  doorTriggerRect(dir) {
    const cx = (this.left + this.right) / 2;
    const cy = (this.top + this.bottom) / 2;
    const reach = 36; // how far into the room the trigger extends
    if (dir === 'n') return { x: cx - C.DOOR_W / 2, y: this.top,            w: C.DOOR_W, h: reach };
    if (dir === 's') return { x: cx - C.DOOR_W / 2, y: this.bottom - reach, w: C.DOOR_W, h: reach };
    if (dir === 'w') return { x: this.left,            y: cy - C.DOOR_W / 2, w: reach, h: C.DOOR_W };
    if (dir === 'e') return { x: this.right - reach,   y: cy - C.DOOR_W / 2, w: reach, h: C.DOOR_W };
    return null;
  }

  // After spawning into this room, where should the player stand?
  // 70px inside the entry door — past the trigger zone, so we don't immediately
  // re-trigger and ping-pong back where we came from.
  spawnPosForEntry(fromDir) {
    const cx = (this.left + this.right) / 2;
    const cy = (this.top + this.bottom) / 2;
    if (!fromDir) return { x: cx, y: cy };
    if (fromDir === 'n') return { x: cx, y: this.top + 70 };
    if (fromDir === 's') return { x: cx, y: this.bottom - 70 };
    if (fromDir === 'w') return { x: this.left + 70, y: cy };
    if (fromDir === 'e') return { x: this.right - 70, y: cy };
    return { x: cx, y: cy };
  }

  // Open all doors. Called when the room becomes cleared.
  openDoors() {
    for (const dir in this.doors) this.doors[dir].opened = true;
    this.cleared = true;
  }

  draw(ctx, hasStairs, theme) {
    // Theme drives every color in here. Falls back to the default palette so
    // the room still draws if no theme is supplied (handy for debugging).
    const t = theme || {
      floor: C.COLOR_FLOOR_TILE, floorDot: C.COLOR_FLOOR_DOT,
      wall: C.COLOR_WALL, wallLine: C.COLOR_WALL_LINE,
      doorLocked: C.COLOR_DOOR_LOCKED, doorOpen: C.COLOR_DOOR_OPEN,
      doorFrame: C.COLOR_DOOR_FRAME, accent: '#7ad97a',
      ambient: null,
    };

    // --- Floor base + dot grid ---
    ctx.fillStyle = t.floor;
    ctx.fillRect(this.left, this.top, this.width, this.height);
    const step = 32;
    ctx.fillStyle = t.floorDot;
    for (let x = this.left + step / 2; x < this.right; x += step) {
      for (let y = this.top + step / 2; y < this.bottom; y += step) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // --- Static grime stains (seeded per room so they don't shimmer) ---
    if (!this.grime) {
      this.grime = [];
      let s = (this.id + 1) * 1337 + 7;
      const next = () => {
        // tiny LCG so spots are deterministic per room
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
      const count = 7 + Math.floor(next() * 4);
      for (let i = 0; i < count; i++) {
        this.grime.push({
          x: this.left + 24 + next() * (this.width - 48),
          y: this.top + 24 + next() * (this.height - 48),
          r: 9 + next() * 16,
          alpha: 0.14 + next() * 0.12,
        });
      }
    }
    for (const g of this.grime) {
      ctx.fillStyle = `rgba(14, 6, 4, ${g.alpha})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Blood splat decals (persistent kills) ---
    for (const d of this.decals) {
      ctx.fillStyle = '#5a0a0a';
      for (const b of d.blobs) {
        ctx.beginPath();
        ctx.arc(d.x + b.ox, d.y + b.oy, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#2a0505';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Theme ambient (pores, bubbles, blood cells, alveoli, synapses) ---
    if (t.ambient) t.ambient(ctx, this);

    // --- Vignette over the playfield, BEFORE walls so it darkens floor only ---
    // Soft so the room still reads bright; the CRT frame handles the heavy
    // edge darkening if any.
    {
      const cx = (this.left + this.right) / 2;
      const cy = (this.top + this.bottom) / 2;
      const grad = ctx.createRadialGradient(cx, cy, Math.min(this.width, this.height) * 0.30,
                                            cx, cy, Math.max(this.width, this.height) * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(this.left, this.top, this.width, this.height);
    }

    // --- Walls — cracked stone with brick seams ---
    ctx.fillStyle = t.wall;
    ctx.fillRect(0, C.HUD_H, C.CANVAS_W, this.top - C.HUD_H);
    ctx.fillRect(0, this.bottom, C.CANVAS_W, C.CANVAS_H - this.bottom);
    ctx.fillRect(0, this.top, this.left, this.height);
    ctx.fillRect(this.right, this.top, C.CANVAS_W - this.right, this.height);

    // Lazy-generate wall grime: stains and cracks, seeded per room.
    if (!this.wallGrime) {
      this.wallGrime = { stains: [], cracks: [] };
      let s = (this.id + 1) * 9173 + 5;
      const rnd = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
      // Stains scattered on all four wall strips.
      for (let i = 0; i < 22; i++) {
        const strip = Math.floor(rnd() * 4); // 0:top 1:bot 2:left 3:right
        let sx, sy;
        if (strip === 0) { sx = rnd() * C.CANVAS_W; sy = C.HUD_H + rnd() * (this.top - C.HUD_H); }
        else if (strip === 1) { sx = rnd() * C.CANVAS_W; sy = this.bottom + rnd() * (C.CANVAS_H - this.bottom); }
        else if (strip === 2) { sx = rnd() * this.left; sy = this.top + rnd() * this.height; }
        else { sx = this.right + rnd() * (C.CANVAS_W - this.right); sy = this.top + rnd() * this.height; }
        this.wallGrime.stains.push({ x: sx, y: sy, r: 4 + rnd() * 10, a: 0.18 + rnd() * 0.22 });
      }
      // Cracks (zig-zag lines) on the walls.
      for (let i = 0; i < 8; i++) {
        const strip = Math.floor(rnd() * 4);
        let x0, y0, dx, dy;
        if (strip === 0) { x0 = rnd() * C.CANVAS_W; y0 = C.HUD_H + 4; dx = 0; dy = 1; }
        else if (strip === 1) { x0 = rnd() * C.CANVAS_W; y0 = this.bottom + 4; dx = 0; dy = 1; }
        else if (strip === 2) { x0 = 4; y0 = this.top + rnd() * this.height; dx = 1; dy = 0; }
        else { x0 = this.right + 4; y0 = this.top + rnd() * this.height; dx = 1; dy = 0; }
        const len = 18 + rnd() * 30;
        const segs = 3 + Math.floor(rnd() * 3);
        const pts = [{ x: x0, y: y0 }];
        for (let k = 0; k < segs; k++) {
          const last = pts[pts.length - 1];
          pts.push({
            x: last.x + dx * (len / segs) + (rnd() - 0.5) * 6 * (1 - dx),
            y: last.y + dy * (len / segs) + (rnd() - 0.5) * 6 * (1 - dy),
          });
        }
        this.wallGrime.cracks.push(pts);
      }
    }
    // Draw stains.
    for (const st of this.wallGrime.stains) {
      ctx.fillStyle = `rgba(8, 4, 6, ${st.a})`;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw cracks.
    ctx.strokeStyle = 'rgba(8, 4, 6, 0.55)';
    ctx.lineWidth = 1.4;
    for (const pts of this.wallGrime.cracks) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.stroke();
    }

    // Brick seams — faint horizontal/vertical lines on the wall strips.
    ctx.strokeStyle = t.wallLine;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    for (let y = C.HUD_H + 8; y < this.top; y += 14) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.CANVAS_W, y); ctx.stroke();
    }
    for (let y = this.bottom + 8; y < C.CANVAS_H; y += 14) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.CANVAS_W, y); ctx.stroke();
    }
    for (let x = 8; x < this.left; x += 14) {
      ctx.beginPath(); ctx.moveTo(x, this.top); ctx.lineTo(x, this.bottom); ctx.stroke();
    }
    for (let x = this.right + 8; x < C.CANVAS_W; x += 14) {
      ctx.beginPath(); ctx.moveTo(x, this.top); ctx.lineTo(x, this.bottom); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Wall outline — thick ink border around the playfield.
    ctx.strokeStyle = t.wallLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.left + 1, this.top + 1, this.width - 2, this.height - 2);
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.left, this.top, this.width, this.height);

    // --- Doors with stone frame + lintel ---
    // Each door's appearance depends on what's on the other side: the boss
    // door looks bloody and spiked, the treasure door is gilded, the shop
    // door is bronzed. Default doors keep the original locked-stone look.
    for (const dir in this.doors) {
      const door = this.doors[dir];
      const r = this.doorRect(dir);
      const kind = door.targetKind; // 'boss' | 'treasure' | 'shop' | etc.

      // Pick the palette by what's behind the door.
      let outerFrame = '#0a0508';
      let innerFrame = t.doorFrame;
      let lockedBody = t.doorLocked;
      let openBody   = t.doorOpen;
      let studColor  = '#1a0c12';
      let glowAccent = t.accent;
      if (kind === 'boss') {
        outerFrame = '#1a0306';
        innerFrame = '#2a0608';
        lockedBody = '#6a1018';
        openBody   = '#a04050';
        studColor  = '#0a0306';
        glowAccent = '#ff3a3a';
      } else if (kind === 'treasure') {
        outerFrame = '#1a0a06';
        innerFrame = '#3a2818';
        lockedBody = '#a07830';
        openBody   = '#e0c060';
        studColor  = '#2a1808';
        glowAccent = '#ffe890';
      } else if (kind === 'shop') {
        outerFrame = '#0a1014';
        innerFrame = '#1a3030';
        lockedBody = '#3a6a60';
        openBody   = '#60a090';
        studColor  = '#08181a';
        glowAccent = '#ffe890';
      }

      // Outer frame (stone or charred bone for boss).
      ctx.fillStyle = outerFrame;
      ctx.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
      // Inner frame.
      ctx.fillStyle = innerFrame;
      ctx.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
      // A door visually reads as "closed" when the room isn't cleared yet
      // OR when it has a lock that still needs a key.
      const visuallyClosed = !door.opened || door.locked;

      // Door body.
      ctx.fillStyle = visuallyClosed ? lockedBody : openBody;
      ctx.fillRect(r.x, r.y, r.w, r.h);

      if (visuallyClosed) {
        // Studs. Bosses get jagged spikes that poke outward; others get
        // standard square iron studs.
        if (kind === 'boss') {
          // Triangular spikes along each long edge of the door.
          ctx.fillStyle = '#d8c898';
          ctx.strokeStyle = '#0a0306';
          ctx.lineWidth = 1.2;
          const horizontal = r.w > r.h;
          const spikes = horizontal ? 5 : 4;
          for (let i = 0; i < spikes; i++) {
            const f = (i + 0.5) / spikes;
            if (horizontal) {
              const sx = r.x + f * r.w;
              // top edge spikes
              ctx.beginPath();
              ctx.moveTo(sx - 3, r.y);
              ctx.lineTo(sx,     r.y - 5);
              ctx.lineTo(sx + 3, r.y);
              ctx.closePath();
              ctx.fill(); ctx.stroke();
              // bottom edge spikes
              ctx.beginPath();
              ctx.moveTo(sx - 3, r.y + r.h);
              ctx.lineTo(sx,     r.y + r.h + 5);
              ctx.lineTo(sx + 3, r.y + r.h);
              ctx.closePath();
              ctx.fill(); ctx.stroke();
            } else {
              const sy = r.y + f * r.h;
              ctx.beginPath();
              ctx.moveTo(r.x,     sy - 3);
              ctx.lineTo(r.x - 5, sy);
              ctx.lineTo(r.x,     sy + 3);
              ctx.closePath();
              ctx.fill(); ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(r.x + r.w,     sy - 3);
              ctx.lineTo(r.x + r.w + 5, sy);
              ctx.lineTo(r.x + r.w,     sy + 3);
              ctx.closePath();
              ctx.fill(); ctx.stroke();
            }
          }
          // Skull-ish centerpiece: dark socket pair + jagged mouth.
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          ctx.fillStyle = '#e0d0a0';
          ctx.beginPath();
          ctx.arc(cx, cy, Math.min(r.w, r.h) * 0.32, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0a0306';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          // Eye sockets.
          ctx.fillStyle = '#0a0306';
          ctx.beginPath();
          ctx.arc(cx - 3, cy - 1, 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + 3, cy - 1, 1.6, 0, Math.PI * 2);
          ctx.fill();
          // Jagged mouth.
          ctx.fillRect(cx - 4, cy + 2, 8, 2);
          // Blood drip down the front of the door.
          ctx.fillStyle = '#4a0a0a';
          ctx.beginPath();
          ctx.arc(cx - 6, r.y + r.h * 0.85, 1.4, 0, Math.PI * 2);
          ctx.arc(cx + 5, r.y + r.h * 0.92, 1.8, 0, Math.PI * 2);
          ctx.arc(cx + 2, r.y + r.h * 0.98, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Iron studs at the corners + central lock (default look).
          ctx.fillStyle = studColor;
          const studs = [
            { sx: r.x + 4,         sy: r.y + 4 },
            { sx: r.x + r.w - 5,   sy: r.y + 4 },
            { sx: r.x + 4,         sy: r.y + r.h - 5 },
            { sx: r.x + r.w - 5,   sy: r.y + r.h - 5 },
          ];
          for (const sd of studs) ctx.fillRect(sd.sx, sd.sy, 2, 2);
          ctx.beginPath();
          ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#3a1a1a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Treasure / shop emblem in the center over the lock.
          if (kind === 'treasure' || kind === 'shop') {
            ctx.font = 'bold 12px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#0a0306';
            ctx.fillText(kind === 'treasure' ? '★' : '$',
                         r.x + r.w / 2 + 0.5, r.y + r.h / 2 + 1);
            ctx.fillStyle = kind === 'treasure' ? '#ffe890' : '#f0d058';
            ctx.fillText(kind === 'treasure' ? '★' : '$',
                         r.x + r.w / 2, r.y + r.h / 2);
          }
        }

        // Padlock + chain overlay when the door is key-locked.
        // Drawn last so it sits on top of any kind-specific decoration.
        if (door.locked) {
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          const horizontal = r.w > r.h;
          // Chain — repeating ovals running across the door.
          ctx.fillStyle = '#5a5a6a';
          ctx.strokeStyle = '#0a0508';
          ctx.lineWidth = 1.2;
          const links = horizontal ? 5 : 4;
          for (let i = 0; i < links; i++) {
            const f = (i + 0.5) / links;
            const lx = horizontal ? r.x + f * r.w : cx;
            const ly = horizontal ? cy : r.y + f * r.h;
            ctx.beginPath();
            ctx.ellipse(lx, ly, horizontal ? 4 : 3, horizontal ? 3 : 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          // Padlock body in the center.
          ctx.fillStyle = '#3a3040';
          ctx.fillRect(cx - 4, cy - 2, 8, 8);
          ctx.strokeStyle = '#0a0508';
          ctx.lineWidth = 1.4;
          ctx.strokeRect(cx - 4, cy - 2, 8, 8);
          // Shackle (curved bar on top).
          ctx.strokeStyle = '#7a7a8a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(cx, cy - 2, 3, Math.PI, 0);
          ctx.stroke();
          // Keyhole.
          ctx.fillStyle = '#0a0508';
          ctx.beginPath();
          ctx.arc(cx, cy + 2, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Open: glowing inner panel. Boss/treasure doors keep their themed
        // accent so you can still tell at a glance where each door leads.
        const pulse = 0.22 + 0.10 * Math.sin(performance.now() / 300);
        ctx.fillStyle = hexToRgba(glowAccent, pulse + 0.10);
        ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      }
    }

    // --- Treasure pedestal ---
    if (this.kind === 'treasure' && !this.itemTaken && this.itemId) {
      const cx = (this.left + this.right) / 2;
      const cy = (this.top + this.bottom) / 2;
      const item = findItemById(this.itemId);
      // Pedestal shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 22, 34, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pedestal base — stone block with shading.
      ctx.fillStyle = '#1a1018';
      ctx.fillRect(cx - 30, cy + 8, 60, 16);
      ctx.fillStyle = '#3a2a3a';
      ctx.fillRect(cx - 26, cy + 4, 52, 14);
      ctx.fillStyle = '#5a4a5a';
      ctx.fillRect(cx - 22, cy - 2, 44, 8);
      // Cracked highlight line on pedestal top.
      ctx.strokeStyle = '#1a0d10';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy);
      ctx.lineTo(cx + 18, cy);
      ctx.stroke();
      // Glow under the item.
      const pulseT = performance.now() / 400;
      const glow = 24 + Math.sin(pulseT) * 5;
      ctx.fillStyle = hexToRgba(item.color, 0.30);
      ctx.beginPath();
      ctx.arc(cx, cy - 16, glow, 0, Math.PI * 2);
      ctx.fill();
      // Item itself — wobbly orb in the item's color, thick outline.
      const itemSeed = (this.id + 1) * 31;
      ctx.fillStyle = item.color;
      pathWobblyCircle(ctx, cx, cy - 16, 11, itemSeed);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 2.4;
      pathWobblyCircle(ctx, cx, cy - 16, 11, itemSeed);
      ctx.stroke();
      // Inner highlight for sparkle.
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 19, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Shop pedestals ---
    if (this.kind === 'shop' && this.shopSlots) {
      const t = performance.now() / 400;
      for (const slot of this.shopSlots) {
        // Pedestal shadow + base (same style as treasure).
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.ellipse(slot.x, slot.y + 22, 30, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1018';
        ctx.fillRect(slot.x - 26, slot.y + 8, 52, 14);
        ctx.fillStyle = '#3a2a3a';
        ctx.fillRect(slot.x - 22, slot.y + 4, 44, 12);
        ctx.fillStyle = '#5a4a5a';
        ctx.fillRect(slot.x - 18, slot.y - 2, 36, 7);

        if (!slot.taken) {
          // Glow under the item — color depends on what's for sale.
          let color = '#c89a30';
          if (slot.kind === 'heart') color = '#ff5a6f';
          else if (slot.kind === 'bomb') color = '#888899';
          else if (slot.kind === 'key') color = '#e0b840';
          else if (slot.kind === 'item' && slot.itemId) {
            const it = findItemById(slot.itemId);
            if (it) color = it.color;
          }
          const glow = 22 + Math.sin(t) * 4;
          ctx.fillStyle = hexToRgba(color, 0.30);
          ctx.beginPath();
          ctx.arc(slot.x, slot.y - 14, glow, 0, Math.PI * 2);
          ctx.fill();

          // Draw the item itself.
          const seed = (this.id + 1) * 37 + slot.x;
          if (slot.kind === 'heart') {
            const w = 22, h = 22;
            ctx.save();
            ctx.translate(slot.x - w / 2, slot.y - 14 - h / 2);
            ctx.fillStyle = '#c81818';
            UI.heartPath(ctx, 0, 0, w, h);
            ctx.fill();
            ctx.strokeStyle = '#0a0306';
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.restore();
          } else if (slot.kind === 'bomb') {
            ctx.fillStyle = '#0a0508';
            pathWobblyCircle(ctx, slot.x, slot.y - 14, 10, seed);
            ctx.fill();
            ctx.strokeStyle = '#1a1018';
            ctx.lineWidth = 2.2;
            pathWobblyCircle(ctx, slot.x, slot.y - 14, 10, seed);
            ctx.stroke();
            ctx.fillStyle = 'rgba(180,180,200,0.55)';
            ctx.beginPath();
            ctx.arc(slot.x - 4, slot.y - 18, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#8a6a40';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(slot.x, slot.y - 24);
            ctx.lineTo(slot.x + 4, slot.y - 30);
            ctx.stroke();
          } else if (slot.kind === 'key') {
            // Brass key — bow (round head with hole) + shaft + teeth.
            const cyK = slot.y - 14;
            ctx.fillStyle = '#e0b840';
            ctx.beginPath();
            ctx.arc(slot.x - 5, cyK, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0a0508';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.fillStyle = '#1a1018';
            ctx.beginPath();
            ctx.arc(slot.x - 5, cyK, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e0b840';
            ctx.fillRect(slot.x - 1, cyK - 2, 10, 4);
            ctx.strokeStyle = '#0a0508';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(slot.x - 1, cyK - 2, 10, 4);
            ctx.fillStyle = '#e0b840';
            ctx.fillRect(slot.x + 7, cyK + 2, 3, 3);
            ctx.fillRect(slot.x + 4, cyK + 2, 2, 3);
          } else {
            // Random treasure orb.
            ctx.fillStyle = color;
            pathWobblyCircle(ctx, slot.x, slot.y - 14, 11, seed);
            ctx.fill();
            ctx.strokeStyle = '#0a0508';
            ctx.lineWidth = 2.4;
            pathWobblyCircle(ctx, slot.x, slot.y - 14, 11, seed);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(slot.x - 3, slot.y - 17, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          // Price tag below pedestal.
          ctx.font = 'bold 14px Courier New';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000';
          ctx.fillText(`${slot.cost}¢`, slot.x + 1, slot.y + 38);
          ctx.fillStyle = '#f0d058';
          ctx.fillText(`${slot.cost}¢`, slot.x, slot.y + 37);
        }
      }

      // "SHOP" sign at the top of the room.
      ctx.font = 'bold 22px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = (this.left + this.right) / 2;
      const ty = this.top + 36;
      ctx.fillStyle = '#000';
      ctx.fillText('SHOP', cx + 2, ty + 2);
      ctx.fillStyle = '#c8a040';
      ctx.fillText('SHOP', cx, ty);
    }

    // --- Stairs to next floor ---
    if (hasStairs) {
      const cx = (this.left + this.right) / 2;
      const cy = (this.top + this.bottom) / 2;
      // Pulsing aura.
      const t = performance.now() / 400;
      const pulse = 26 + Math.sin(t) * 5;
      ctx.fillStyle = 'rgba(154, 223, 255, 0.20)';
      ctx.beginPath();
      ctx.arc(cx, cy, pulse + 16, 0, Math.PI * 2);
      ctx.fill();
      // Dark pit
      ctx.fillStyle = '#050308';
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      // Stairs
      ctx.fillStyle = C.COLOR_STAIRS;
      pathWobblyCircle(ctx, cx, cy, 22, this.id * 13);
      ctx.fill();
      ctx.strokeStyle = '#0a0508';
      ctx.lineWidth = 3;
      pathWobblyCircle(ctx, cx, cy, 22, this.id * 13);
      ctx.stroke();
      ctx.fillStyle = '#0a0508';
      ctx.font = 'bold 22px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('>', cx, cy + 1);
    }
  }
}

// Returns the opposite direction. Used when traversing doors.
function oppositeDir(d) {
  return { n: 's', s: 'n', e: 'w', w: 'e' }[d];
}

// Tiny helper so themes can hand us a hex color and still get a translucent fill.
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
