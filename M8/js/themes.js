// themes.js — five visual themes, one per floor.
// The conceit: you're descending through a giant creature's body.
//   F1 Skin  -> F2 Stomach -> F3 Bloodstream -> F4 Lungs -> F5 Brain
//
// Each theme owns its colors and an `ambient` function that draws floor flair
// (pores, bubbles, blood cells, alveoli, synapses) inside the room. Keeping
// this data declarative means a future me can re-skin a floor without touching
// any engine code.

const THEMES = [
  // --- Floor 1: Skin -------------------------------------------------------
  {
    name: 'Skin',
    floor:      '#2a1820',
    floorDot:   '#3e2630',
    wall:       '#5d3340',
    wallLine:   '#7a4858',
    doorLocked: '#6a2530',
    doorOpen:   '#e08090',
    doorFrame:  '#3a1820',
    accent:     '#d56a7a',
    enemyColors: { walker: '#c75570', shooter: '#a04060', charger: '#e08038', splitter: '#d8a0a8' },
    ambient(ctx, room) {
      // Pores — uneven dots, slightly bigger than the base grid.
      const seed = 17;
      ctx.fillStyle = '#4a2a36';
      for (let i = 0; i < 80; i++) {
        const x = room.left + 20 + ((i * 73 + seed) % (room.width - 40));
        const y = room.top + 20 + ((i * 131 + seed) % (room.height - 40));
        const r = 1 + ((i * 7) % 3);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  // --- Floor 2: Stomach ----------------------------------------------------
  {
    name: 'Stomach',
    floor:      '#1f2a16',
    floorDot:   '#2e3d22',
    wall:       '#4a5d28',
    wallLine:   '#6e8038',
    doorLocked: '#566820',
    doorOpen:   '#c8d860',
    doorFrame:  '#2a3a14',
    accent:     '#c8d860',
    enemyColors: { walker: '#9aa83a', shooter: '#c0d048', charger: '#d89a30', splitter: '#7ec050' },
    ambient(ctx, room) {
      // Acid bubbles drifting up. Time-driven so they actually rise.
      const t = performance.now() / 1000;
      ctx.strokeStyle = '#7a9040';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 24; i++) {
        const baseX = room.left + 30 + ((i * 53) % (room.width - 60));
        const phase = (i * 0.6);
        const yRange = room.height - 40;
        const y = room.bottom - 20 - ((t * 30 + i * 47) % yRange);
        const wobble = Math.sin(t * 1.5 + phase) * 6;
        const r = 3 + (i % 4);
        ctx.beginPath();
        ctx.arc(baseX + wobble, y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },
  // --- Floor 3: Bloodstream -----------------------------------------------
  {
    name: 'Bloodstream',
    floor:      '#28121a',
    floorDot:   '#3c1c26',
    wall:       '#6a2030',
    wallLine:   '#8a3848',
    doorLocked: '#7a1d28',
    doorOpen:   '#ff6a78',
    doorFrame:  '#3a0c14',
    accent:     '#ff6a78',
    enemyColors: { walker: '#d83a48', shooter: '#a02838', charger: '#e07050', splitter: '#c0606a' },
    ambient(ctx, room) {
      // Red blood cells flowing left-to-right.
      const t = performance.now() / 1000;
      const flow = (t * 60) % 80;
      for (let row = 0; row < 5; row++) {
        const y = room.top + 60 + row * 90;
        for (let i = 0; i < 12; i++) {
          const x = room.left + 20 + ((i * 80 + flow + row * 25) % (room.width - 40));
          ctx.fillStyle = '#5a1a26';
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3a0e16';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  },
  // --- Floor 4: Lungs ------------------------------------------------------
  {
    name: 'Lungs',
    floor:      '#1a2230',
    floorDot:   '#283248',
    wall:       '#4d5c75',
    wallLine:   '#6c7e9a',
    doorLocked: '#3d4a60',
    doorOpen:   '#9ad8ff',
    doorFrame:  '#1a2230',
    accent:     '#9ad8ff',
    enemyColors: { walker: '#5a8aa8', shooter: '#7aa0c0', charger: '#a0c0d8', splitter: '#80b8d0' },
    ambient(ctx, room) {
      // Alveoli — clusters of small rings.
      ctx.strokeStyle = '#3a4860';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 22; i++) {
        const cx = room.left + 40 + ((i * 91) % (room.width - 80));
        const cy = room.top + 30 + ((i * 173) % (room.height - 60));
        for (let j = 0; j < 4; j++) {
          const a = (j / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // Slow pulse — the lungs breathing.
      const t = performance.now() / 1000;
      const pulse = 0.05 + 0.03 * Math.sin(t * 0.8);
      ctx.fillStyle = `rgba(154, 216, 255, ${pulse})`;
      ctx.fillRect(room.left, room.top, room.width, room.height);
    },
  },
  // --- Floor 5: Brain ------------------------------------------------------
  {
    name: 'Brain',
    floor:      '#1a1430',
    floorDot:   '#2a2048',
    wall:       '#4a3878',
    wallLine:   '#6a55a0',
    doorLocked: '#3d2a6a',
    doorOpen:   '#c89aff',
    doorFrame:  '#1a1430',
    accent:     '#c89aff',
    enemyColors: { walker: '#9870d8', shooter: '#b890ff', charger: '#e0a0e0', splitter: '#a888d8' },
    ambient(ctx, room) {
      // Synapses — random tiny lightning between nodes.
      const t = performance.now() / 1000;
      const seed = 19;
      ctx.strokeStyle = '#5a44a8';
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const x1 = room.left + 30 + ((i * 67 + seed) % (room.width - 60));
        const y1 = room.top + 30 + ((i * 127 + seed) % (room.height - 60));
        const x2 = x1 + Math.sin(t * 2 + i) * 30;
        const y2 = y1 + Math.cos(t * 2 + i * 1.3) * 30;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // Node dots at the endpoints.
        ctx.fillStyle = '#a070ff';
        ctx.beginPath();
        ctx.arc(x1, y1, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
];

function getTheme(floorIdx) {
  return THEMES[Math.max(0, Math.min(THEMES.length - 1, floorIdx))];
}
