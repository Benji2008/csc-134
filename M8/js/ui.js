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
    // Background bar.
    ctx.fillStyle = '#1a1620';
    ctx.fillRect(0, 0, C.CANVAS_W, C.HUD_H);
    ctx.strokeStyle = C.COLOR_WALL_LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, C.HUD_H);
    ctx.lineTo(C.CANVAS_W, C.HUD_H);
    ctx.stroke();

    // Hearts — half-hearts, so a heart icon = 2 hp.
    const fullHearts = Math.floor(player.hp / 2);
    const halfHeart  = (player.hp % 2) === 1;
    const totalHearts = Math.ceil(player.maxHp / 2);
    const heartSize = 22;
    const heartGap = 6;
    let hx = 12, hy = 9;
    for (let i = 0; i < totalHearts; i++) {
      let mode;
      if (i < fullHearts) mode = 'full';
      else if (i === fullHearts && halfHeart) mode = 'half';
      else mode = 'empty';
      UI.drawHeart(ctx, hx, hy, heartSize, mode);
      hx += heartSize + heartGap;
    }

    // Floor label, centered. Includes themed name.
    const themeName = (typeof getTheme === 'function') ? getTheme(floorIdx).name : '';
    ctx.fillStyle = C.COLOR_TEXT;
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Floor ${floorIdx + 1} / ${C.TOTAL_FLOORS}: ${themeName}`, C.CANVAS_W / 2, C.HUD_H / 2);

    // Timer, right-aligned.
    ctx.textAlign = 'right';
    ctx.fillStyle = C.COLOR_TEXT_DIM;
    ctx.fillText(UI.formatTime(runTimeMs), C.CANVAS_W - 12, C.HUD_H / 2);

    // Acquired items strip below the timer.
    UI.drawItemStrip(ctx, player.items);
  },

  drawHeart(ctx, x, y, size, mode) {
    // 'mode' is 'full' | 'half' | 'empty'.
    // Hearts drawn as two arcs + a triangle. Pixel-y but readable.
    const w = size, h = size;
    ctx.save();
    ctx.translate(x, y);

    // Empty silhouette underneath.
    ctx.fillStyle = C.COLOR_HEART_EMPTY;
    UI.heartPath(ctx, 0, 0, w, h);
    ctx.fill();

    if (mode === 'empty') { ctx.restore(); return; }

    if (mode === 'full') {
      ctx.fillStyle = C.COLOR_HEART;
      UI.heartPath(ctx, 0, 0, w, h);
      ctx.fill();
    } else if (mode === 'half') {
      // Clip to left half then draw red.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w / 2, h);
      ctx.clip();
      ctx.fillStyle = C.COLOR_HEART;
      UI.heartPath(ctx, 0, 0, w, h);
      ctx.fill();
      ctx.restore();
    }
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
    ctx.fillStyle = C.COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px Courier New';
    ctx.fillText('CRYPT CRAWLER', C.CANVAS_W / 2, 150);

    ctx.font = '18px Courier New';
    ctx.fillStyle = C.COLOR_TEXT_DIM;
    ctx.fillText('A 5-floor dungeon. One run, one timer.', C.CANVAS_W / 2, 185);

    // Stats panel.
    const lines = [
      `Total wins:       ${stats.wins}`,
      `Current streak:   ${stats.currentStreak}`,
      `Best streak:      ${stats.bestStreak}`,
      `Best time:        ${UI.formatTime(stats.bestTimeMs)}`,
    ];
    ctx.fillStyle = C.COLOR_TEXT;
    ctx.font = '20px Courier New';
    ctx.textAlign = 'left';
    let y = 260;
    const x = C.CANVAS_W / 2 - 160;
    for (const l of lines) {
      ctx.fillText(l, x, y);
      y += 30;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0e68c';
    ctx.font = 'bold 22px Courier New';
    ctx.fillText('Press SPACE to start', C.CANVAS_W / 2, 460);

    ctx.fillStyle = C.COLOR_TEXT_DIM;
    ctx.font = '14px Courier New';
    ctx.fillText('WASD = move    Arrow keys = shoot    P = pause', C.CANVAS_W / 2, 500);
    ctx.fillText('Hold Shift+R on this screen to wipe stats', C.CANVAS_W / 2, 520);
  },

  drawGameOver(ctx, stats, floorIdx) {
    UI.dimBackdrop(ctx);
    ctx.fillStyle = '#ff6a6a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px Courier New';
    ctx.fillText('YOU DIED', C.CANVAS_W / 2, 200);

    ctx.fillStyle = C.COLOR_TEXT_DIM;
    ctx.font = '20px Courier New';
    ctx.fillText(`Made it to floor ${floorIdx + 1}.`, C.CANVAS_W / 2, 245);
    ctx.fillText(`Streak reset. Total wins still ${stats.wins}.`, C.CANVAS_W / 2, 275);
    ctx.fillText(`Best streak: ${stats.bestStreak}`, C.CANVAS_W / 2, 305);

    ctx.fillStyle = '#f0e68c';
    ctx.font = 'bold 20px Courier New';
    ctx.fillText('Press SPACE to return to the title', C.CANVAS_W / 2, 400);
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
    const t = Math.max(0, Math.min(1, ttl / totalMs));
    // Fade in over the first 200ms, fade out over the last 400ms.
    let alpha = 1;
    if (ttl > totalMs - 200) alpha = (totalMs - ttl) / 200;
    else if (ttl < 400) alpha = ttl / 400;
    alpha = Math.max(0, Math.min(1, alpha));

    const padX = 18, padY = 10;
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + padX * 2;
    const h = 36;
    const x = (C.CANVAS_W - w) / 2;
    const y = C.CANVAS_H - 80;
    ctx.fillStyle = `rgba(20, 16, 28, ${0.85 * alpha})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `rgba(240, 230, 140, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = `rgba(240, 230, 211, ${alpha})`;
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
