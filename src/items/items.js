// Item definitions. Icons are drawn procedurally on a 32x32 grid and cached as images.
import { circle, ellipse, rrect } from '../core/utils.js';

// stack: how many fit in one slot (default 1). tool: true if it can be used with Space.
export const ITEMS = {
  axe: {
    name: 'Axe',
    description: 'Select it and press Space facing a tree to chop.',
    tool: true,
    draw(g) {
      g.strokeStyle = '#8b5a2b';
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(8, 28);
      g.lineTo(22, 6);
      g.stroke();
      g.fillStyle = '#9aa0a8';
      g.beginPath();
      g.moveTo(17, 5);
      g.lineTo(27, 3);
      g.lineTo(29, 14);
      g.lineTo(21, 12);
      g.closePath();
      g.fill();
      g.fillStyle = '#e1e6ec';
      g.fillRect(27, 4, 2, 10);
    },
  },

  wood: {
    name: 'Wood',
    description: 'Freshly chopped logs. Good for building.',
    stack: 20,
    draw(g) {
      const log = (x, y) => {
        g.fillStyle = '#7a4a26';
        g.fillRect(x, y, 18, 7);
        g.fillStyle = '#5e3a1d';
        g.fillRect(x, y + 5, 18, 2);
        g.fillStyle = '#d9b07a';
        g.beginPath();
        g.ellipse(x + 18, y + 3.5, 3, 3.5, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#a77b4a';
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(x + 18, y + 3.5, 1.4, 1.8, 0, 0, Math.PI * 2);
        g.stroke();
      };
      log(5, 17);
      log(9, 9);
      log(3, 24);
    },
  },

  apple: {
    name: 'Apple',
    description: 'Crisp and red.',
    draw(g) {
      g.fillStyle = '#5a3a1e';
      g.fillRect(15, 5, 2, 6);
      g.fillStyle = '#3f9a3f';
      ellipse(g, 21, 8, 5, 2.5);
      g.fillStyle = '#c0392b';
      circle(g, 12, 18, 9);
      circle(g, 20, 18, 9);
      g.fillStyle = '#e45a4a';
      circle(g, 11, 15, 3);
    },
  },

  lantern: {
    name: 'Lantern',
    description: 'Lights up the dark.',
    draw(g) {
      g.strokeStyle = '#3a3a3a';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(16, 7, 4, Math.PI, 0);
      g.stroke();
      g.fillStyle = '#ffd36b';
      rrect(g, 9, 10, 14, 15, 3);
      g.fillStyle = '#fff3c4';
      rrect(g, 13, 13, 6, 9, 2);
      g.fillStyle = '#3a3a3a';
      g.fillRect(8, 8, 16, 3);
      g.fillRect(8, 24, 16, 4);
      g.fillRect(9, 10, 2, 15);
      g.fillRect(21, 10, 2, 15);
    },
  },

  fishingRod: {
    name: 'Fishing Rod',
    description: 'Maybe something lives in the pond...',
    draw(g) {
      g.strokeStyle = '#8b5a2b';
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(5, 28);
      g.lineTo(26, 5);
      g.stroke();
      g.fillStyle = '#4a4a4a';
      circle(g, 9, 24, 3);
      g.strokeStyle = '#e8e8e8';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(26, 5);
      g.lineTo(27, 20);
      g.stroke();
      g.strokeStyle = '#bbb';
      g.beginPath();
      g.arc(25.5, 21, 2, 0, Math.PI);
      g.stroke();
    },
  },
};

const iconCache = new Map();

/** Data URL for an item's icon, rendered once at 2x for crispness. */
export function iconUrl(type) {
  if (!iconCache.has(type)) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.scale(2, 2);
    ITEMS[type].draw(g);
    iconCache.set(type, c.toDataURL());
  }
  return iconCache.get(type);
}

const imageCache = new Map();

/** Image element for an item's icon (for drawing items on the canvas, e.g. dropped loot). */
export function iconImage(type) {
  if (!imageCache.has(type)) {
    const img = new Image();
    img.src = iconUrl(type);
    imageCache.set(type, img);
  }
  return imageCache.get(type);
}

export const maxStack = (type) => ITEMS[type].stack ?? 1;

export const makeItem = (type, count = 1) => ({ type, count });
