// input.js — keyboard state.
// Other code asks `Input.isDown('w')` instead of binding listeners itself.

const Input = (function () {
  const down = new Set();
  // Track keys that were just pressed this frame, for one-shot actions like Pause.
  const pressed = new Set();

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!down.has(k)) pressed.add(k);
    down.add(k);
    // Stop arrow keys / space from scrolling the page.
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    down.delete(e.key.toLowerCase());
  });

  return {
    isDown(key) {
      return down.has(key.toLowerCase());
    },
    // True only on the first frame the key was pressed. Caller should consume it.
    wasPressed(key) {
      return pressed.has(key.toLowerCase());
    },
    // Called once per frame at the END of the frame to clear one-shot pressed set.
    endFrame() {
      pressed.clear();
    },
  };
})();
