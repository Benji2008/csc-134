// ui.js — HUD plus title / game over / victory overlays.
// All drawing functions take a context and any data they need; they don't read
// global game state directly, which keeps them easy to test by hand.

const UI = {
  // Format ms -> "M:SS.mm" so victory time is readable.
  formatTime(ms) {
    if (ms == null) return '--:--';
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const cs = Math.floor((ms % 1000) / 10);
    return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  },

  drawHUD(ctx, player, floorIdx, runTimeMs) {
    // Background bar — dark with subtle gradient + grime.
    const grad = ctx.createLinearGradient(0, 0, 0, C.HUD_H);
    grad.addColorStop(0, '#1a0d0d');
    grad.addColorStop(1, '#0c0608');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, C.CANVAS_W, C.HUD_H);
    // Grime stains baked once per session.
    if (!UI._hudGrime) {
      UI._hudGrime = [];
      for (let i = 0; i < 24; i++) {
        UI._hudGrime.push({
          x: Math.random() * C.CANVAS_W,
          y: Math.random() * C.HUD_H,
          r: 1 + Math.random() * 4,
          a: 0.10 + Math.random() * 0.25,
        });
      }
    }
    for (const g of UI._hudGrime) {
      ctx.fillStyle = `rgba(0,0,0,${g.a})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Thick ink border under the HUD.
    ctx.strokeStyle = '#0a0306';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, C.HUD_H);
    ctx.lineTo(C.CANVAS_W, C.HUD_H);
    ctx.stroke();
    ctx.strokeStyle = '#3a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, C.HUD_H - 4);
    ctx.lineTo(C.CANVAS_W, C.HUD_H - 4);
    ctx.stroke();

    // Hearts — half-hearts, so a heart icon = 2 hp.
    const fullHearts = Math.floor(player.hp / 2);
    const halfHeart  = (player.hp % 2) === 1;
    const totalHearts = Math.ceil(player.maxHp / 2);
    const heartSize = 24;
    const heartGap = 5;
    let hx = 14, hy = 8;
    for (let i = 0; i < totalHearts; i++) {
      let mode;
      if (i < fullHearts) mode = 'full';
      else if (i === fullHearts && halfHeart) mode = 'half';
      else mode = 'empty';
      UI.drawHeart(ctx, hx, hy, heartSize, mode);
      hx += heartSize + heartGap;
    }

    // Coin + bomb counters tucked to the right of the hearts.
    const cy = C.HUD_H / 2;
    ctx.font = 'bold 16px Courier New';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Coin glyph
    let pillX = hx + 12;
    ctx.fillStyle = '#c89a30';
    ctx.beginPath();
    ctx.arc(pillX + 6, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#0a0508';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('¢', pillX + 6, cy + 1);
    // count
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000';
    ctx.fillText(String(player.coins | 0), pillX + 16, cy + 1);
    ctx.fillStyle = '#f0d058';
    ctx.fillText(String(player.coins | 0), pillX + 15, cy);

    // Bomb glyph
    pillX = pillX + 16 + Math.max(20, ctx.measureText(String(player.coins | 0)).width + 4);
    ctx.fillStyle = '#0a0508';
    ctx.beginPath();
    ctx.arc(pillX + 6, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1018';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = '#8a6a40';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(pillX + 6, cy - 7);
    ctx.lineTo(pillX + 10, cy - 11);
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText(String(player.bombs | 0), pillX + 16, cy + 1);
    ctx.fillStyle = '#d8d0c0';
    ctx.fillText(String(player.bombs | 0), pillX + 15, cy);

    // Key glyph — brass key shape next to bomb counter.
    pillX = pillX + 16 + Math.max(20, ctx.measureText(String(player.bombs | 0)).width + 4);
    ctx.fillStyle = '#e0b840';
    ctx.beginPath();
    ctx.arc(pillX + 4, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0508';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#1a1018';
    ctx.beginPath();
    ctx.arc(pillX + 4, cy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0b840';
    ctx.fillRect(pillX + 8, cy - 1.5, 8, 3);
    ctx.fillRect(pillX + 14, cy + 1.5, 2, 2.5);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText(String(player.keys | 0), pillX + 22, cy + 1);
    ctx.fillStyle = '#f0d058';
    ctx.fillText(String(player.keys | 0), pillX + 21, cy);

    // Floor label, centered. Includes themed name. Shadowed for grit.
    const themeName = (typeof getTheme === 'function') ? getTheme(floorIdx).name : '';
    const label = `FLOOR ${floorIdx + 1} / ${C.TOTAL_FLOORS}  ·  ${themeName.toUpperCase()}`;
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(label, C.CANVAS_W / 2 + 1, C.HUD_H / 2 + 1);
    ctx.fillStyle = '#d8b890';
    ctx.fillText(label, C.CANVAS_W / 2, C.HUD_H / 2);

    // Timer, right-aligned.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000';
    ctx.fillText(UI.formatTime(runTimeMs), C.CANVAS_W - 11, C.HUD_H / 2 + 1);
    ctx.fillStyle = '#9a8870';
    ctx.fillText(UI.formatTime(runTimeMs), C.CANVAS_W - 12, C.HUD_H / 2);

    // Acquired items strip below the timer.
    UI.drawItemStrip(ctx, player.items);
  },

  drawHeart(ctx, x, y, size, mode) {
    // 'mode' is 'full' | 'half' | 'empty'.
    // Hearts drawn as two arcs + a triangle. Lumpy + thick-outlined.
    const w = size, h = size;
    ctx.save();
    ctx.translate(x, y);

    // Empty silhouette underneath.
    ctx.fillStyle = '#2a0a14';
    UI.heartPath(ctx, 0, 0, w, h);
    ctx.fill();

    if (mode === 'full') {
      ctx.fillStyle = '#c81818';
      UI.heartPath(ctx, 0, 0, w, h);
      ctx.fill();
      // Highlight pip — top-left.
      ctx.fillStyle = 'rgba(255, 180, 180, 0.7)';
      ctx.beginPath();
      ctx.ellipse(w * 0.32, h * 0.32, w * 0.10, h * 0.08, -0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (mode === 'half') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w / 2, h);
      ctx.clip();
      ctx.fillStyle = '#c81818';
      UI.heartPath(ctx, 0, 0, w, h);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 180, 180, 0.7)';
      ctx.beginPath();
      ctx.ellipse(w * 0.30, h * 0.32, w * 0.08, h * 0.07, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Thick ink outline around the heart silhouette.
    ctx.strokeStyle = '#0a0306';
    ctx.lineWidth = 2.2;
    UI.heartPath(ctx, 0, 0, w, h);
    ctx.stroke();

    ctx.restore();
  },

  heartPath(ctx, x, y, w, h) {
    ctx.beginPath();
    const topY = y + h * 0.30;
    ctx.moveTo(x + w / 2, y + h);
    ctx.bezierCurveTo(x + w * 1.1, y + h * 0.6, x + w * 0.85, y - h * 0.1, x + w / 2, topY);
    ctx.bezierCurveTo(x + w * 0.15, y - h * 0.1, x - w * 0.1, y + h * 0.6, x + w / 2, y + h);
  },

  drawBossBar(ctx, boss) {
    if (!boss) return;
    const barW = 360, barH = 14;
    const x = (C.CANVAS_W - barW) / 2;
    const y = C.CANVAS_H - 30;
    ctx.fillStyle = '#2a1a22';
    ctx.fillRect(x, y, barW, barH);
    const pct = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = '#d04a4a';
    ctx.fillRect(x, y, barW * pct, barH);
    ctx.strokeStyle = '#5a527a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = C.COLOR_TEXT;
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boss.name.toUpperCase(), C.CANVAS_W / 2, y - 12);
  },

  drawTitle(ctx, stats) {
    UI.dimBackdrop(ctx);
    // Dripping bloody title.
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Courier New';
    // Drop shadow
    ctx.fillStyle = '#000';
    ctx.fillText('CRYPT CRAWLER', C.CANVAS_W / 2 + 3, 153);
    // Dark red base
    ctx.fillStyle = '#5a0a0a';
    ctx.fillText('CRYPT CRAWLER', C.CANVAS_W / 2 + 1, 151);
    // Brighter red top
    ctx.fillStyle = '#c81818';
    ctx.fillText('CRYPT CRAWLER', C.CANVAS_W / 2, 150);

    ctx.font = 'italic 19px Courier New';
    ctx.fillStyle = '#8a6a58';
    ctx.fillText('descend through five floors of meat and shadow', C.CANVAS_W / 2, 190);

    // Stats panel — framed.
    const panelX = C.CANVAS_W / 2 - 200;
    const panelY = 240;
    ctx.fillStyle = 'rgba(20, 10, 12, 0.7)';
    ctx.fillRect(panelX, panelY, 400, 150);
    ctx.strokeStyle = '#3a1a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, 400, 150);

    const lines = [
      `Total wins:       ${stats.wins}`,
      `Current streak:   ${stats.currentStreak}`,
      `Best streak:      ${stats.bestStreak}`,
      `Best time:        ${UI.formatTime(stats.bestTimeMs)}`,
    ];
    ctx.fillStyle = '#c8a890';
    ctx.font = '20px Courier New';
    ctx.textAlign = 'left';
    let y = panelY + 32;
    const x = panelX + 30;
    for (const l of lines) {
      ctx.fillText(l, x, y);
      y += 30;
    }

    ctx.textAlign = 'center';
    // Pulse "press space" so it reads as the action prompt.
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(performance.now() / 500));
    ctx.fillStyle = `rgba(240, 200, 90, ${pulse})`;
    ctx.font = 'bold 24px Courier New';
    ctx.fillText('PRESS SPACE TO DESCEND', C.CANVAS_W / 2, 460);

    ctx.fillStyle = '#6a5a72';
    ctx.font = '14px Courier New';
    ctx.fillText('WASD = move    Arrow keys = shoot    E = place bomb    P = pause', C.CANVAS_W / 2, 500);
    ctx.fillText('Hold Shift+R on this screen to wipe stats', C.CANVAS_W / 2, 520);
  },

  drawGameOver(ctx, stats, floorIdx) {
    UI.dimBackdrop(ctx);
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Courier New';
    ctx.fillStyle = '#000';
    ctx.fillText('YOU DIED', C.CANVAS_W / 2 + 3, 203);
    ctx.fillStyle = '#5a0a0a';
    ctx.fillText('YOU DIED', C.CANVAS_W / 2 + 1, 201);
    ctx.fillStyle = '#d83838';
    ctx.fillText('YOU DIED', C.CANVAS_W / 2, 200);

    ctx.fillStyle = '#8a6a58';
    ctx.font = '20px Courier New';
    ctx.fillText(`Made it to floor ${floorIdx + 1}.`, C.CANVAS_W / 2, 250);
    ctx.fillText(`Streak reset. Total wins still ${stats.wins}.`, C.CANVAS_W / 2, 280);
    ctx.fillText(`Best streak: ${stats.bestStreak}`, C.CANVAS_W / 2, 310);

    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(performance.now() / 500));
    ctx.fillStyle = `rgba(240, 200, 90, ${pulse})`;
    ctx.font = 'bold 22px Courier New';
    ctx.fillText('Press SPACE to return', C.CANVAS_W / 2, 400);
  },

  drawVictory(ctx, stats, runTimeMs, isNewBest) {
    UI.dimBackdrop(ctx);
    ctx.fillStyle = '#7ad97a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px Courier New';
    ctx.fillText('CONGRATULATIONS!', C.CANVAS_W / 2, 130);

    ctx.fillStyle = C.COLOR_TEXT;
    ctx.font = '22px Courier New';
    ctx.fillText(`You beat the Crypt in ${UI.formatTime(runTimeMs)}`, C.CANVAS_W / 2, 180);
    if (isNewBest) {
      ctx.fillStyle = '#f0e68c';
      ctx.font = 'bold 20px Courier New';
      ctx.fillText('** NEW BEST TIME **', C.CANVAS_W / 2, 210);
    }

    ctx.fillStyle = C.COLOR_TEXT;
    ctx.textAlign = 'left';
    ctx.font = '20px Courier New';
    const x = C.CANVAS_W / 2 - 160;
    let y = 270;
    const lines = [
      `Total wins:       ${stats.wins}`,
      `Current streak:   ${stats.currentStreak}`,
      `Longest streak:   ${stats.bestStreak}`,
      `Best time:        ${UI.formatTime(stats.bestTimeMs)}`,
    ];
    for (const l of lines) { ctx.fillText(l, x, y); y += 30; }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0e68c';
    ctx.font = 'bold 22px Courier New';
    ctx.fillText('Press SPACE to play again', C.CANVAS_W / 2, 470);
  },

  // Toast that fades in/out when the player picks up an item.
  drawPickupToast(ctx, text, ttl) {
    const totalMs = 2800;
    // Fade in over the first 200ms, fade out over the last 400ms.
    let alpha = 1;
    if (ttl > totalMs - 200) alpha = (totalMs - ttl) / 200;
    else if (ttl < 400) alpha = ttl / 400;
    alpha = Math.max(0, Math.min(1, alpha));

    const padX = 20, padY = 12;
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + padX * 2;
    const h = 40;
    const x = (C.CANVAS_W - w) / 2;
    const y = C.CANVAS_H - 90;
    // Dark base + grime
    ctx.fillStyle = `rgba(10, 6, 10, ${0.88 * alpha})`;
    ctx.fillRect(x, y, w, h);
    // Inner highlight
    ctx.fillStyle = `rgba(60, 30, 30, ${0.45 * alpha})`;
    ctx.fillRect(x + 2, y + 2, w - 4, 4);
    // Thick ink border
    ctx.strokeStyle = `rgba(10, 4, 6, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = `rgba(200, 160, 80, ${alpha})`;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    // Text with shadow
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillText(text, C.CANVAS_W / 2 + 1, y + h / 2 + 1);
    ctx.fillStyle = `rgba(240, 220, 170, ${alpha})`;
    ctx.fillText(text, C.CANVAS_W / 2, y + h / 2);
  },

  // Tiny strip of acquired-item dots at the top of the HUD.
  drawItemStrip(ctx, items) {
    if (!items || items.length === 0) return;
    const x0 = C.CANVAS_W - 18;
    const y = C.HUD_H - 8;
    for (let i = 0; i < items.length; i++) {
      const def = findItemById(items[i]);
      if (!def) continue;
      const cx = x0 - i * 14;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(cx, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1620';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },

  // BoI-style minimap, top-right under the HUD. Shows visited rooms in full,
  // adjacent unvisited rooms as dim silhouettes, and highlights the current room.
  drawMinimap(ctx, floor, currentRoom) {
    if (!floor || !floor.rooms) return;
    const cell = 16, gap = 2;

    // Bounds of the room grid so we can size the panel.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of floor.rooms) {
      if (r.gridX < minX) minX = r.gridX;
      if (r.gridX > maxX) maxX = r.gridX;
      if (r.gridY < minY) minY = r.gridY;
      if (r.gridY > maxY) maxY = r.gridY;
    }
    const cols = (maxX - minX + 1);
    const rows = (maxY - minY + 1);
    const gridW = cols * cell + (cols - 1) * gap;
    const gridH = rows * cell + (rows - 1) * gap;
    const padX = 6, padY = 6;
    const panelX = C.CANVAS_W - 14 - gridW - padX * 2;
    const panelY = C.HUD_H + 8;
    const panelW = gridW + padX * 2;
    const panelH = gridH + padY * 2;

    // Panel background — same dark/inked look as other UI.
    ctx.fillStyle = 'rgba(10, 6, 10, 0.78)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#0a0306';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#3a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);

    // Which rooms should be visible? Visited rooms + their direct neighbors.
    const visible = new Set();
    for (const r of floor.rooms) {
      if (!r.visited) continue;
      visible.add(r.id);
      for (const dir in r.doors) {
        const t = r.doors[dir].target;
        if (t != null) visible.add(t);
      }
    }

    const ox = panelX + padX;
    const oy = panelY + padY;
    for (const r of floor.rooms) {
      if (!visible.has(r.id)) continue;
      const cx = ox + (r.gridX - minX) * (cell + gap);
      const cy = oy + (r.gridY - minY) * (cell + gap);

      // Pick fill color. Unvisited (just glimpsed) rooms are dim and uncolored.
      let fill = '#2a1f2a';
      let glyph = '';
      let glyphColor = '#f0e0c0';
      if (r.visited) {
        if (r.kind === 'boss')     { fill = '#7a1a28'; glyph = '!'; }
        else if (r.kind === 'treasure') { fill = '#8a6a20'; glyph = '★'; glyphColor = '#ffe890'; }
        else if (r.kind === 'shop')     { fill = '#2a6a60'; glyph = '$'; glyphColor = '#ffe890'; }
        else if (r.kind === 'start')    { fill = '#5a5a6a'; }
        else                            { fill = '#3a2a3a'; }
        // Cleared enemy rooms get a slightly lighter tint so it's easy to see
        // what's still threatening at a glance.
        if (r.kind === 'enemy' && r.cleared) fill = '#4a3a4a';
      } else {
        // Adjacent but unvisited — still hint at boss / treasure / shop.
        if (r.kind === 'boss') fill = '#3a1018';
      }

      ctx.fillStyle = fill;
      ctx.fillRect(cx, cy, cell, cell);

      if (glyph) {
        ctx.fillStyle = glyphColor;
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyph, cx + cell / 2, cy + cell / 2 + 1);
      }

      // Current room — bright pulsing outline.
      if (r === currentRoom) {
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(performance.now() / 280));
        ctx.strokeStyle = `rgba(240, 220, 140, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 0.5, cy - 0.5, cell + 1, cell + 1);
      } else {
        ctx.strokeStyle = '#0a0508';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + 0.5, cy + 0.5, cell - 1, cell - 1);
      }
    }
  },

  drawPause(ctx) {
    UI.dimBackdrop(ctx, 0.6);
    ctx.fillStyle = C.COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px Courier New';
    ctx.fillText('PAUSED', C.CANVAS_W / 2, C.CANVAS_H / 2 - 10);
    ctx.font = '18px Courier New';
    ctx.fillStyle = C.COLOR_TEXT_DIM;
    ctx.fillText('Press P to resume', C.CANVAS_W / 2, C.CANVAS_H / 2 + 24);
  },

  dimBackdrop(ctx, alpha = 0.85) {
    ctx.fillStyle = `rgba(14, 12, 20, ${alpha})`;
    ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
  },
};
