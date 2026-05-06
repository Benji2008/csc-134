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

    // --- Theme ambient (pores, bubbles, blood cells, alveoli, synapses) ---
    if (t.ambient) t.ambient(ctx, this);

    // --- Walls ---
    ctx.fillStyle = t.wall;
    ctx.fillRect(0, C.HUD_H, C.CANVAS_W, this.top - C.HUD_H);
    ctx.fillRect(0, this.bottom, C.CANVAS_W, C.CANVAS_H - this.bottom);
    ctx.fillRect(0, this.top, this.left, this.height);
    ctx.fillRect(this.right, this.top, C.CANVAS_W - this.right, this.height);
    ctx.strokeStyle = t.wallLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.left + 1, this.top + 1, this.width - 2, this.height - 2);
    ctx.strokeStyle = '#1a1620';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.left, this.top, this.width, this.height);

    // --- Doors ---
    for (const dir in this.doors) {
      const door = this.doors[dir];
      const r = this.doorRect(dir);
      ctx.fillStyle = t.doorFrame;
      ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
      ctx.fillStyle = door.opened ? t.doorOpen : t.doorLocked;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (!door.opened) {
        ctx.fillStyle = '#1a0c12';
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glow color picks up the theme accent.
        const accent = t.accent;
        ctx.fillStyle = hexToRgba(accent, 0.28);
        ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      }
    }

    // --- Treasure pedestal ---
    if (this.kind === 'treasure' && !this.itemTaken && this.itemId) {
      const cx = (this.left + this.right) / 2;
      const cy = (this.top + this.bottom) / 2;
      const item = findItemById(this.itemId);
      // Pedestal base.
      ctx.fillStyle = '#3a3552';
      ctx.fillRect(cx - 26, cy + 4, 52, 14);
      ctx.fillStyle = '#5a527a';
      ctx.fillRect(cx - 22, cy - 2, 44, 8);
      // Glow under the item.
      const pulseT = performance.now() / 400;
      const glow = 22 + Math.sin(pulseT) * 4;
      ctx.fillStyle = hexToRgba(item.color, 0.25);
      ctx.beginPath();
      ctx.arc(cx, cy - 14, glow, 0, Math.PI * 2);
      ctx.fill();
      // Item itself — bright orb in the item's color.
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(cx, cy - 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1620';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Inner highlight for sparkle.
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 17, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Stairs to next floor ---
    if (hasStairs) {
      const cx = (this.left + this.right) / 2;
      const cy = (this.top + this.bottom) / 2;
      // Pulsing aura.
      const t = performance.now() / 400;
      const pulse = 24 + Math.sin(t) * 4;
      ctx.fillStyle = 'rgba(154, 223, 255, 0.18)';
      ctx.beginPath();
      ctx.arc(cx, cy, pulse + 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.COLOR_STAIRS;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1620';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#1a1620';
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
