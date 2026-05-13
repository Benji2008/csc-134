// player.js — the hero. WASD to move, arrow keys to shoot in 4 directions.

// --- Characters ------------------------------------------------------------
// Picked on the character-select screen. Each entry tweaks starting stats,
// inventory, and visuals so different runs feel different from the first shot.
//
// `startItems` is a list of item ids applied to the player at spawn — useful
// for giving Eve her natural Whore of Babylon-style bouncing bullets without
// reimplementing the effect.
const CHARACTERS = [
  {
    id: 'isaac',
    name: 'ISAAC',
    blurb: 'the boy with the holy book',
    bodyColor: '#f0d8b0',
    outline:   '#1a0d10',
    tearColor: '#8cc8eb',
    tearOutline: '#1e3c5a',
    mouthColor: '#3a1818',
    footColor: '#2a1818',
    hpDelta: 0,
    damageDelta: 0,
    speedMul: 1.0,
    cooldownMul: 1.0,
    startCoins: 0,
    startBombs: 1,
    startKeys: 1,
    startSoulHearts: 0,
    startItems: [],
  },
  {
    id: 'eve',
    name: 'EVE',
    blurb: 'her blood is her weapon',
    bodyColor: '#d0a8b0',
    outline:   '#1a0810',
    tearColor: '#c81830',
    tearOutline: '#4a0810',
    mouthColor: '#7a1828',
    footColor: '#3a1820',
    // Glass-cannon profile: less HP, but harder hits and starts with bouncing
    // bullets so her first room already plays differently.
    hpDelta: -2,            // 2 hearts max (4 hp)
    damageDelta: 1,
    speedMul: 0.95,
    cooldownMul: 0.92,
    startCoins: 5,
    startBombs: 0,
    startKeys: 0,
    startSoulHearts: 2,     // born with 1 soul heart's worth of cushion
    startItems: ['bouncing'],
  },
];

function findCharacter(id) {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
}

class Player {
  constructor(x, y, character) {
    // Default to Isaac if no character was passed (back-compat for any caller
    // that still uses `new Player(x, y)`).
    this.character = character || CHARACTERS[0];
    const ch = this.character;
    this.x = x;
    this.y = y;
    this.r = C.PLAYER_RADIUS;
    // Stats live on the instance (not constants) so items can mutate them.
    this.maxHp = Math.max(2, C.PLAYER_MAX_HP + (ch.hpDelta || 0));
    this.hp = this.maxHp;
    this.soulHearts = ch.startSoulHearts || 0;
    this.speed = C.PLAYER_SPEED * (ch.speedMul || 1.0);
    this.iframesMax = C.PLAYER_IFRAMES_MS;
    this.fireCooldownMs = C.PLAYER_FIRE_COOLDOWN_MS * (ch.cooldownMul || 1.0);
    this.bulletSpeed = C.PLAYER_BULLET_SPEED;
    this.bulletDamage = C.PLAYER_BULLET_DAMAGE + (ch.damageDelta || 0);
    this.bulletRadius = C.PLAYER_BULLET_RADIUS;
    this.bulletTtlMs = C.PLAYER_BULLET_TTL_MS;
    // Bullet behavior flags — items toggle these.
    this.shotPattern = 'single';    // 'single' | 'twin' | 'spread'
    this.bulletPiercing = false;
    this.bulletHoming = false;
    this.bulletBouncing = false;
    // Vampire counter: every Nth kill, heal half a heart.
    this.vampireKillsNeeded = 0;    // 0 = vampire item not picked up
    this.vampireKills = 0;

    // Pickups inventory (character may override starting counts).
    this.coins = ch.startCoins ?? 0;
    this.bombs = ch.startBombs ?? 1;
    this.maxBombs = 9;
    this.keys = ch.startKeys ?? 1;
    this.maxKeys = 99;
    // Item-effect flags.
    this.luckBoost = 1.0;            // multiplies enemy drop chance
    this.pickupMagnet = false;       // pickups within range fly toward player
    this.fastDiagonal = false;       // disables diagonal normalization

    // Runtime state
    this.iframes = 0;               // ms remaining
    this.fireCooldown = 0;
    this.lookX = 0; this.lookY = 1;
    this.muzzleFlash = 0;
    // Velocity for smooth accel/decel — gives weight without feeling drifty.
    this.vx = 0; this.vy = 0;
    // Items collected during this run (array of item ids), shown in HUD.
    this.items = [];

    // Tears — Isaac is permanently crying. Each entry: {x,y,vx,vy,r,ttl,maxTtl}.
    this.tears = [];
    this.tearSpawnT = 0.4; // sec until next tear
    this.tearSide = 1;     // alternates so both eyes weep

    // Hand-drawn wobble: stable per-instance seed so the silhouette doesn't shimmer.
    this.seed = Math.random() * 9999;
    // Walk-cycle phase. Accumulates only while moving so idle is still.
    this.walkT = 0;
    this.moving = false;

    // --- Charged shot ----------------------------------------------------
    // Hold an arrow direction continuously to charge. After ~0.5s of holding
    // the same direction, normal fire pauses and a ring grows around the
    // player. Release the arrow to fire a beefy tear in that direction.
    this.chargeT = 0;          // sec held in current direction
    this.chargeDirX = 0;
    this.chargeDirY = 0;
    this.chargeReady = false;  // true once chargeT >= threshold

    // Apply the character's starting items so the player begins the run with
    // them already active (e.g. Eve gets Bouncing Bullets).
    for (const id of (ch.startItems || [])) {
      const item = (typeof findItemById === 'function') ? findItemById(id) : null;
      if (item) {
        item.apply(this);
        this.items.push(id);
      }
    }
  }

  update(dt, room, projectiles) {
    // --- movement ---
    // Movement is WASD only. Arrow keys are reserved for shooting so we don't
    // get the awkward case where pressing left both moves and fires you left.
    let dx = 0, dy = 0;
    if (Input.isDown('a')) dx -= 1;
    if (Input.isDown('d')) dx += 1;
    if (Input.isDown('w')) dy -= 1;
    if (Input.isDown('s')) dy += 1;

    // Normalize diagonals — pythagoras would otherwise let you go ~1.4x faster.
    // The Big Step item disables normalization for a speed-demon feel.
    if (dx !== 0 && dy !== 0 && !this.fastDiagonal) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv; dy *= inv;
    }

    // Velocity-based movement. Accel ramps in fast (~0.08s to top speed) and
    // decel is slightly snappier (~0.06s to stop) so the player feels weighty
    // but never sluggish — Isaac-style tight control with a hint of skid.
    const targetVx = dx * this.speed;
    const targetVy = dy * this.speed;
    // Exponential approach: rate is "per second"; convert with 1 - exp(-k*dt).
    const accelK = 18;   // higher = snappier acceleration
    const decelK = 22;   // higher = snappier stop
    const kx = (dx !== 0) ? accelK : decelK;
    const ky = (dy !== 0) ? accelK : decelK;
    this.vx += (targetVx - this.vx) * (1 - Math.exp(-kx * dt));
    this.vy += (targetVy - this.vy) * (1 - Math.exp(-ky * dt));
    // Dead zone so we don't creep at sub-pixel speeds when standing still.
    if (dx === 0 && Math.abs(this.vx) < 4) this.vx = 0;
    if (dy === 0 && Math.abs(this.vy) < 4) this.vy = 0;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Walk bob — phase tracks actual speed, not raw input, so the bob ramps
    // in/out with the accel curve instead of snapping on/off.
    const speedNow = Math.hypot(this.vx, this.vy);
    this.moving = speedNow > 8;
    if (this.moving) this.walkT += dt * 11 * (speedNow / this.speed);

    // Clamp to room bounds. Zero the velocity on the clamped axis so you don't
    // build up phantom momentum while held against a wall.
    if (this.x < room.left + this.r)   { this.x = room.left + this.r;   if (this.vx < 0) this.vx = 0; }
    if (this.x > room.right - this.r)  { this.x = room.right - this.r;  if (this.vx > 0) this.vx = 0; }
    if (this.y < room.top + this.r)    { this.y = room.top + this.r;    if (this.vy < 0) this.vy = 0; }
    if (this.y > room.bottom - this.r) { this.y = room.bottom - this.r; if (this.vy > 0) this.vy = 0; }

    // --- shooting + charged shot ---
    // Movement uses WASD, shooting uses arrows — classic twin-stick on a keyboard.
    this.fireCooldown -= dt * 1000;
    let sx = 0, sy = 0;
    if (Input.isDown('arrowleft'))  sx -= 1;
    if (Input.isDown('arrowright')) sx += 1;
    if (Input.isDown('arrowup'))    sy -= 1;
    if (Input.isDown('arrowdown'))  sy += 1;
    if (sx !== 0) sy = 0;
    const arrowHeld = (sx !== 0 || sy !== 0);
    const CHARGE_THRESHOLD = 0.55;  // sec of continuous holding to unlock charged shot
    if (arrowHeld) {
      // Direction change resets the charge so you can't sweep through dirs to bank charge.
      if (sx !== this.chargeDirX || sy !== this.chargeDirY) {
        this.chargeT = 0;
        this.chargeReady = false;
      }
      this.chargeDirX = sx;
      this.chargeDirY = sy;
      this.chargeT += dt;
      if (this.chargeT >= CHARGE_THRESHOLD) this.chargeReady = true;
      // Normal continuous fire — only while not fully charged. Once charge
      // is ready, fire pauses so the charged tear gets a clean release.
      if (!this.chargeReady && this.fireCooldown <= 0) {
        this.shoot(sx, sy, projectiles);
        this.fireCooldown = this.fireCooldownMs;
        this.lookX = sx; this.lookY = sy;
        this.muzzleFlash = 70;
      }
    } else {
      // Released. If we'd built up a full charge, release it now in the last
      // held direction. Otherwise just clear state.
      if (this.chargeReady) {
        this.shootCharged(this.chargeDirX, this.chargeDirY, projectiles);
        this.lookX = this.chargeDirX; this.lookY = this.chargeDirY;
        this.muzzleFlash = 140;
        this.fireCooldown = this.fireCooldownMs;
      }
      this.chargeT = 0;
      this.chargeReady = false;
      this.chargeDirX = 0;
      this.chargeDirY = 0;
    }

    // --- timers ---
    if (this.iframes > 0) this.iframes -= dt * 1000;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt * 1000;

    // --- tears: spawn + advance ---
    this.tearSpawnT -= dt;
    if (this.tearSpawnT <= 0) {
      // Drop from one of the two eyes (alternates). Eyes are at a fixed
      // horizontal layout on the face so tears fall straight down from each.
      const off = this.r * 0.42;
      const sign = this.tearSide;
      const tx = this.x + sign * off * 0.7;
      const ty = this.y - off * 0.15 + 2;
      this.tears.push({
        x: tx, y: ty,
        vx: (Math.random() - 0.5) * 24,
        vy: 40 + Math.random() * 20,
        r: 2 + Math.random() * 1.2,
        ttl: 650, maxTtl: 650,
      });
      this.tearSide = -this.tearSide;
      this.tearSpawnT = 0.45 + Math.random() * 0.5;
    }
    for (const t of this.tears) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += 240 * dt; // gravity
      t.vx *= 0.96;
      t.ttl -= dt * 1000;
    }
    this.tears = this.tears.filter(t => t.ttl > 0);
  }

  // Spawn 1+ projectiles based on the player's current shot pattern.
  // Twin = two parallel bullets; Spread = three bullets in a small arc.
  shoot(sx, sy, projectiles) {
    const speed = this.bulletSpeed;
    const opts = {
      radius: this.bulletRadius,
      ttl: this.bulletTtlMs,
      damage: this.bulletDamage,
    };
    if (this.bulletPiercing) opts.piercing = true;
    if (this.bulletHoming) opts.homing = true;
    if (this.bulletBouncing) opts.bouncing = true;

    if (this.shotPattern === 'twin') {
      // Two parallel bullets offset along the perpendicular.
      const perpX = -sy, perpY = sx;
      const off = 8;
      projectiles.push(new Projectile(
        this.x + perpX * off, this.y + perpY * off,
        sx * speed, sy * speed, 'player', opts
      ));
      projectiles.push(new Projectile(
        this.x - perpX * off, this.y - perpY * off,
        sx * speed, sy * speed, 'player', opts
      ));
    } else if (this.shotPattern === 'spread') {
      // Three-bullet narrow cone.
      const baseAngle = Math.atan2(sy, sx);
      const spread = 0.18; // ~10 degrees
      for (const dA of [-spread, 0, spread]) {
        const a = baseAngle + dA;
        projectiles.push(new Projectile(
          this.x, this.y, Math.cos(a) * speed, Math.sin(a) * speed, 'player', opts
        ));
      }
    } else {
      projectiles.push(new Projectile(
        this.x, this.y, sx * speed, sy * speed, 'player', opts
      ));
    }
  }

  // Charged shot — fatter, faster, 2.5x damage. Respects all item flags
  // (piercing/homing/bouncing) so it stacks with builds. Pattern is forced
  // back to single so it's one giant tear rather than three.
  shootCharged(sx, sy, projectiles) {
    const speed = this.bulletSpeed * 1.20;
    const opts = {
      radius: this.bulletRadius * 1.9,
      ttl: this.bulletTtlMs * 1.3,
      damage: this.bulletDamage * 2.5,
      charged: true,
    };
    if (this.bulletPiercing) opts.piercing = true;
    if (this.bulletHoming) opts.homing = true;
    if (this.bulletBouncing) opts.bouncing = true;
    projectiles.push(new Projectile(
      this.x, this.y, sx * speed, sy * speed, 'player', opts
    ));
  }

  takeDamage(amount) {
    if (this.iframes > 0) return false;
    // Soul hearts soak hits half-heart-by-half-heart before regular HP. A
    // 1-full-heart hit (e.g. bomb blast) chews through 2 soul half-hearts.
    let remaining = amount;
    while (remaining > 0 && this.soulHearts > 0) {
      this.soulHearts -= 1;
      remaining -= 1;
    }
    if (remaining > 0) this.hp -= remaining;
    this.iframes = this.iframesMax;
    return true;
  }

  // Called by the main loop when an enemy dies, so the Vampire item works.
  onEnemyKilled() {
    if (this.vampireKillsNeeded <= 0) return;
    this.vampireKills += 1;
    if (this.vampireKills >= this.vampireKillsNeeded) {
      this.vampireKills = 0;
      this.heal(1);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  isDead() {
    return this.hp <= 0;
  }

  draw(ctx) {
    // Muzzle flash drawn UNDER the player so the player isn't washed out.
    if (this.muzzleFlash > 0) {
      const t = this.muzzleFlash / 70;
      ctx.fillStyle = `rgba(255, 247, 194, ${0.45 * t})`;
      ctx.beginPath();
      ctx.arc(this.x + this.lookX * (this.r + 4), this.y + this.lookY * (this.r + 4), 13 * t, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flicker while invulnerable so the player can read the i-frame state.
    const flickerOff = this.iframes > 0 && Math.floor(this.iframes / 80) % 2 === 0;
    if (flickerOff) return;

    // Walk bob — vertical bounce while moving. Head bobs harder than the
    // body so the silhouette reads as a kid bouncing on his feet.
    const bobY = this.moving ? Math.sin(this.walkT) * 2.0 : 0;
    const py = this.y + bobY;

    // Soft drop shadow — stays on the ground regardless of bob, anchored to
    // where the feet land.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 1.65, this.r * 1.00, this.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Charge ring — grows as the player holds an arrow toward a charged shot.
    // Drawn under the body so the player silhouette stays clean on top.
    if (this.chargeT > 0.1) {
      const ratio = Math.min(1, this.chargeT / 0.55);
      const flick = this.chargeReady ? (0.85 + 0.15 * Math.sin(performance.now() / 60)) : 1;
      ctx.strokeStyle = this.chargeReady
        ? `rgba(255, 240, 140, ${0.85 * flick})`
        : `rgba(180, 200, 255, ${0.55 * ratio})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, py, this.r + 6 + ratio * 6, 0, Math.PI * 2);
      ctx.stroke();
      // Inner glow when fully charged.
      if (this.chargeReady) {
        ctx.fillStyle = `rgba(255, 240, 140, ${0.15 * flick})`;
        ctx.beginPath();
        ctx.arc(this.x, py, this.r + 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Body lump + feet beneath the head — BoI-style silhouette.
    // Character palette drives colors; brighten slightly during iframes.
    const ch = this.character || CHARACTERS[0];
    const bright = this.iframes > 0;
    const bodyColor = bright ? lightenHex(ch.bodyColor, 0.18) : ch.bodyColor;
    drawCreatureBody(ctx, this.x, this.y, this.r, {
      bodyColor, outline: ch.outline, footColor: ch.footColor,
      moving: this.moving, phase: this.walkT, seed: this.seed,
    });

    // Head — wobbly hand-drawn circle with thick character-colored outline.
    ctx.fillStyle = bodyColor;
    pathWobblyCircle(ctx, this.x, py, this.r, this.seed);
    ctx.fill();
    // Soft underbelly shadow on the head — 2-tone shading per BoI guide.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(120, 70, 60, 0.32)';
    ctx.fillRect(this.x - this.r, py + this.r * 0.15, this.r * 2, this.r);
    ctx.restore();
    // Thick ink outline.
    ctx.strokeStyle = ch.outline;
    ctx.lineWidth = 2.8;
    pathWobblyCircle(ctx, this.x, py, this.r, this.seed);
    ctx.stroke();

    // Big asymmetric Isaac eyes. Eye SOCKETS are locked to a fixed horizontal
    // layout (the head always faces the camera) and only the pupils shift to
    // track the look direction — that's what sells the BoI 3/4-view feel
    // instead of pure top-down.
    const off = this.r * 0.42;
    const eyeR  = [this.r * 0.34, this.r * 0.30];
    const pupilR = [this.r * 0.16, this.r * 0.14];
    let i = 0;
    for (const sign of [-1, 1]) {
      const cxE = this.x + sign * off * 0.7;
      const cyE = py - off * 0.15;
      // white of the eye
      ctx.fillStyle = '#f8eed8';
      ctx.beginPath();
      ctx.arc(cxE, cyE, eyeR[i], 0, Math.PI * 2);
      ctx.fill();
      // dark eye outline
      ctx.strokeStyle = ch.outline;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // pupil tracks the look direction within the socket.
      ctx.fillStyle = '#0a0508';
      ctx.beginPath();
      ctx.arc(cxE + this.lookX * eyeR[i] * 0.40,
              cyE + this.lookY * eyeR[i] * 0.40,
              pupilR[i], 0, Math.PI * 2);
      ctx.fill();
      i++;
    }

    // Tiny mouth — crooked frown for that permanent BoI sadness.
    ctx.strokeStyle = ch.mouthColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const mx = this.x;
    const my = py + this.r * 0.38;
    ctx.moveTo(mx - 3, my + 1);
    ctx.lineTo(mx, my - 0.5);
    ctx.lineTo(mx + 3, my + 1);
    ctx.stroke();

    // Tears — glossy droplets dripping from the eyes. Character palette.
    const tearRgb = hexToRgbTriple(ch.tearColor);
    const tearOutlineRgb = hexToRgbTriple(ch.tearOutline);
    for (const t of this.tears) {
      const alpha = Math.min(1, t.ttl / t.maxTtl);
      ctx.fillStyle = `rgba(${tearRgb}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${tearOutlineRgb}, ${alpha * 0.85})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // highlight pip
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.35, t.y - t.r * 0.35, t.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Costume overlays — item-driven sprites stacked on the head.
    this.drawCostumes(ctx, this.x, py, this.r);
  }

  // Stack of item-driven costume sprites drawn on top of the player. Each
  // item id with a costume registers its drawer in PLAYER_COSTUMES below.
  drawCostumes(ctx, x, headY, headR) {
    if (!this.items || this.items.length === 0) return;
    for (const id of this.items) {
      const drawer = PLAYER_COSTUMES[id];
      if (drawer) drawer(ctx, x, headY, headR, this.walkT);
    }
  }
}

// --- Helpers ---------------------------------------------------------------
// Brighten a #rrggbb color by `amount` (0..1). Used during iframes.
function lightenHex(hex, amount) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  let r = (v >> 16) & 0xff, g = (v >> 8) & 0xff, b = v & 0xff;
  r = Math.min(255, r + Math.round((255 - r) * amount));
  g = Math.min(255, g + Math.round((255 - g) * amount));
  b = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
// "#aabbcc" -> "170, 187, 204" for rgba() string construction.
function hexToRgbTriple(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '255, 255, 255';
  const v = parseInt(m[1], 16);
  return `${(v >> 16) & 0xff}, ${(v >> 8) & 0xff}, ${v & 0xff}`;
}

// --- Costume layers --------------------------------------------------------
// Each entry: itemId -> (ctx, x, headY, headR, walkT) => void.
// Drawn AFTER the head/eyes/mouth, in items.array order — so picking up halo
// then sacred_heart stacks the halo and the floating heart visibly.
const PLAYER_COSTUMES = {
  halo(ctx, x, headY, headR) {
    ctx.fillStyle = 'rgba(255, 240, 160, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, headY - headR - 4, headR * 0.95, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff0a0';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.ellipse(x, headY - headR - 4, headR * 0.85, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#a89020';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, headY - headR - 4, headR * 0.85, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  },
  sacred_heart(ctx, x, headY, headR) {
    // Tiny floating heart above the head.
    const bob = Math.sin(performance.now() / 320) * 1.4;
    const w = 9, h = 9;
    ctx.save();
    ctx.translate(x - w / 2, headY - headR - 11 + bob);
    if (typeof UI !== 'undefined' && UI.heartPath) {
      ctx.fillStyle = '#ffd8a8';
      UI.heartPath(ctx, 0, 0, w, h);
      ctx.fill();
      ctx.strokeStyle = '#7a3a1a';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  },
  cursed_skull(ctx, x, headY, headR) {
    // Curved black horns on either side of the head.
    ctx.fillStyle = '#1a0d10';
    ctx.beginPath();
    ctx.moveTo(x - headR * 0.55, headY - headR * 0.55);
    ctx.quadraticCurveTo(x - headR * 0.95, headY - headR * 1.25, x - headR * 0.50, headY - headR * 1.15);
    ctx.quadraticCurveTo(x - headR * 0.45, headY - headR * 0.85, x - headR * 0.55, headY - headR * 0.55);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + headR * 0.55, headY - headR * 0.55);
    ctx.quadraticCurveTo(x + headR * 0.95, headY - headR * 1.25, x + headR * 0.50, headY - headR * 1.15);
    ctx.quadraticCurveTo(x + headR * 0.45, headY - headR * 0.85, x + headR * 0.55, headY - headR * 0.55);
    ctx.fill();
  },
  pyromaniac(ctx, x, headY, headR) {
    // Tiny flame flickering on top of the head.
    const flick = 1 + Math.sin(performance.now() / 70) * 0.25;
    const cy = headY - headR - 4;
    ctx.fillStyle = '#ff6a2a';
    ctx.beginPath();
    ctx.moveTo(x, cy - 7 * flick);
    ctx.quadraticCurveTo(x + 4, cy - 2, x + 3, cy + 2);
    ctx.quadraticCurveTo(x, cy + 4, x - 3, cy + 2);
    ctx.quadraticCurveTo(x - 4, cy - 2, x, cy - 7 * flick);
    ctx.fill();
    ctx.fillStyle = '#ffe080';
    ctx.beginPath();
    ctx.moveTo(x, cy - 4 * flick);
    ctx.quadraticCurveTo(x + 2, cy, x, cy + 2);
    ctx.quadraticCurveTo(x - 2, cy, x, cy - 4 * flick);
    ctx.fill();
  },
  mr_mega(ctx, x, headY, headR) {
    // Same flame as Pyromaniac but bigger and more orange.
    PLAYER_COSTUMES.pyromaniac(ctx, x, headY - 2, headR);
  },
  cursed_eye(ctx, x, headY, headR) {
    // Third eye on the forehead.
    const cy = headY - headR * 0.55;
    ctx.fillStyle = '#f8eed8';
    ctx.beginPath();
    ctx.arc(x, cy, headR * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0d10';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#a040a0';
    ctx.beginPath();
    ctx.arc(x, cy, headR * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0508';
    ctx.beginPath();
    ctx.arc(x, cy, headR * 0.06, 0, Math.PI * 2);
    ctx.fill();
  },
  polyphemus(ctx, x, headY, headR) {
    // Bigger third eye, gold iris — stacks visually with cursed_eye.
    const cy = headY - headR * 0.50;
    ctx.fillStyle = '#f8eed8';
    ctx.beginPath();
    ctx.arc(x + headR * 0.30, cy, headR * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0d10';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#c89030';
    ctx.beginPath();
    ctx.arc(x + headR * 0.30, cy, headR * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0508';
    ctx.beginPath();
    ctx.arc(x + headR * 0.30, cy, headR * 0.08, 0, Math.PI * 2);
    ctx.fill();
  },
  vampire(ctx, x, headY, headR) {
    // Tiny white fangs poking down from the mouth area.
    const my = headY + headR * 0.4;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1a0d10';
    ctx.lineWidth = 0.8;
    for (const dx of [-3, 2]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, my);
      ctx.lineTo(x + dx + 1.5, my + 4);
      ctx.lineTo(x + dx + 3, my);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  },
  magnet(ctx, x, headY, headR) {
    // Mini magnet "hat" on top.
    const cy = headY - headR - 1;
    ctx.fillStyle = '#b03038';
    ctx.beginPath();
    ctx.rect(x - 6, cy - 4, 4, 4);
    ctx.rect(x + 2, cy - 4, 4, 4);
    ctx.rect(x - 6, cy, 12, 3);
    ctx.fill();
    ctx.strokeStyle = '#1a0d10';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(x - 6, cy - 4, 4, 4);
    ctx.strokeRect(x + 2, cy - 4, 4, 4);
    ctx.strokeRect(x - 6, cy, 12, 3);
    ctx.fillStyle = '#d8d0c0';
    ctx.fillRect(x - 6, cy - 5, 4, 1.5);
    ctx.fillRect(x + 2, cy - 5, 4, 1.5);
  },
  glass_cannon(ctx, x, headY, headR) {
    // Jagged crack across the head.
    ctx.strokeStyle = '#1a0d10';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - headR * 0.6, headY - headR * 0.2);
    ctx.lineTo(x - headR * 0.2, headY - headR * 0.05);
    ctx.lineTo(x + headR * 0.1, headY - headR * 0.4);
    ctx.lineTo(x + headR * 0.5, headY - headR * 0.1);
    ctx.stroke();
  },
  the_soul(ctx, x, headY, headR) {
    // Floating pale-blue wisp above the head.
    const bob = Math.sin(performance.now() / 280) * 1.5;
    const cy = headY - headR - 10 + bob;
    ctx.fillStyle = 'rgba(200, 200, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x, cy, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 120, 200, 0.85)';
    ctx.lineWidth = 1;
    ctx.stroke();
  },
  soul_heart(ctx, x, headY, headR) {
    // Same wisp as The Soul but smaller.
    const bob = Math.sin(performance.now() / 280) * 1.2;
    const cy = headY - headR - 7 + bob;
    ctx.fillStyle = 'rgba(200, 200, 255, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x + 4, cy, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  rotten_baby(ctx, x, headY, headR) {
    // Two tiny flies orbiting the head.
    const t = performance.now() / 350;
    for (let i = 0; i < 2; i++) {
      const a = t + i * Math.PI;
      const fx = x + Math.cos(a) * (headR + 8);
      const fy = headY + Math.sin(a) * (headR * 0.5);
      ctx.fillStyle = '#1a1a0a';
      ctx.beginPath();
      ctx.arc(fx, fy, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,200,200,0.4)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(fx - 2, fy);
      ctx.lineTo(fx + 2, fy);
      ctx.stroke();
    }
  },
  wrath_of_the_lamb(ctx, x, headY, headR) {
    // Mini cross above the head.
    const cy = headY - headR - 6;
    ctx.fillStyle = '#ffb0c0';
    ctx.fillRect(x - 1, cy - 4, 2, 9);
    ctx.fillRect(x - 3, cy - 1, 6, 2);
    ctx.strokeStyle = '#3a0a0a';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(x - 1, cy - 4, 2, 9);
    ctx.strokeRect(x - 3, cy - 1, 6, 2);
  },
};
