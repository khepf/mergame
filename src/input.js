const keys = new Set();
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (PREVENT.has(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

const down = (...codes) => codes.some((c) => keys.has(c));

export const input = {
  axis() {
    let x = 0, y = 0;
    if (down('KeyA', 'ArrowLeft')) x -= 1;
    if (down('KeyD', 'ArrowRight')) x += 1;
    if (down('KeyW', 'ArrowUp')) y -= 1;
    if (down('KeyS', 'ArrowDown')) y += 1;
    return { x, y };
  },
  running() {
    return down('ShiftLeft', 'ShiftRight');
  },
};
