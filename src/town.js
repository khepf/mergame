// Market Square: a cobblestone plaza with empty lots where shops will go.
import { TILE, T } from './constants.js';
import { circle, ellipse, rrect } from './utils.js';
import { buildStore, GENERAL_STORE } from './store.js';

export const TOWN_W = 32; // tiles
export const TOWN_H = 17;

const LOT_W = 7, LOT_H = 5;

/** Deterministic per-tile noise in [0, 1). */
function hash(tx, ty, i = 0) {
  let h = (tx * 73856093) ^ (ty * 19349663) ^ (i * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function buildTown(world, x0, y0) {
  for (let ty = y0; ty < y0 + TOWN_H; ty++)
    for (let tx = x0; tx < x0 + TOWN_W; tx++) world.setTile(tx, ty, T.STONE);

  // Three lots along the north side, three along the south, a main street between.
  const lots = [];
  for (const side of ['north', 'south']) {
    for (let i = 0; i < 3; i++) {
      const lot = { side, x: x0 + 2 + i * 10, y: side === 'north' ? y0 + 1 : y0 + TOWN_H - 1 - LOT_H, w: LOT_W, h: LOT_H };
      for (let ty = lot.y; ty < lot.y + lot.h; ty++)
        for (let tx = lot.x; tx < lot.x + lot.w; tx++) world.setTile(tx, ty, T.LOT);
      lots.push(lot);
    }
  }

  const midY = y0 + Math.floor(TOWN_H / 2);
  const town = {
    x: x0, y: y0, w: TOWN_W, h: TOWN_H, lots,
    entrance: { x: x0, y: midY }, // where the path arrives (west edge, main street)
    signs: [],

    contains(px, py) {
      const tx = px / TILE, ty = py / TILE;
      return tx >= x0 && tx < x0 + TOWN_W && ty >= y0 && ty < y0 + TOWN_H;
    },

    paintGround(g) {
      for (let ty = y0; ty < y0 + TOWN_H; ty++)
        for (let tx = x0; tx < x0 + TOWN_W; tx++) {
          const t = world.getTile(tx, ty);
          if (t === T.STONE) paintCobbles(g, tx, ty);
          else if (t === T.LOT) paintLot(g, tx, ty);
        }
      // Curb around the plaza
      g.strokeStyle = '#6f6a61';
      g.lineWidth = 2;
      g.strokeRect(x0 * TILE + 1, y0 * TILE + 1, TOWN_W * TILE - 2, TOWN_H * TILE - 2);
      // Clear the curb where the path comes in
      paintCobbles(g, x0, midY);
      for (const lot of lots) if (!lot.store) paintLotBorder(g, lot);
      town.store?.paintGround(g);
    },
  };

  // ---- Props ----
  const prop = (tx, ty, tw, th, draw, extra = {}) => {
    for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) world.block(x, y);
    const obj = { x: (tx + tw / 2) * TILE, y: (ty + th) * TILE, draw, ...extra };
    world.addObject(obj);
    return obj;
  };

  // Fountain in the middle of the square
  const fx = x0 + TOWN_W / 2 - 1, fy = midY - 1;
  const fountain = prop(fx, fy, 2, 2, function (ctx) { drawFountain(ctx, this.x, this.y); });
  town.fountain = { x: fountain.x, y: fountain.y - 26 }; // center of the basin (for sound)

  // Lamp posts flanking the entrance and the far end of the street
  for (const [lx, ly] of [[x0 + 1, midY - 2], [x0 + 1, midY + 2], [x0 + TOWN_W - 2, midY - 2], [x0 + TOWN_W - 2, midY + 2]]) {
    prop(lx, ly, 1, 1, function (ctx) { drawLamp(ctx, this.x, this.y); });
  }

  // A sign at the front of each lot, facing the street
  const clickable = (obj, message, hw, top) => {
    obj.hitbox = { x: obj.x - hw, y: obj.y - top, w: hw * 2, h: top };
    obj.canInteract = () => true;
    obj.onClick = () => world.notify?.(message);
    town.signs.push(obj);
    return obj;
  };
  lots.forEach((lot, i) => {
    // The top-left lot is the General Store; the rest are still for sale.
    if (i === 0) {
      lot.store = town.store = buildStore(world, lot, GENERAL_STORE);
      return;
    }
    const sx = lot.x + Math.floor(lot.w / 2);
    const sy = lot.side === 'north' ? lot.y + lot.h - 1 : lot.y;
    const sign = prop(sx, sy, 1, 1, function (ctx) { drawLotSign(ctx, this.x, this.y); });
    clickable(sign, `Lot ${i + 1}: an empty plot. A shop is coming soon!`, 13, 34);
  });

  // Welcome sign where the path arrives
  const welcome = prop(x0 - 2, midY - 2, 1, 1, function (ctx) { drawWelcomeSign(ctx, this.x, this.y); });
  clickable(welcome, 'Welcome to Market Square! Visit the General Store to buy and sell.', 30, 42);

  return town;
}

// ---- Ground painting ----

function paintCobbles(g, tx, ty) {
  const px = tx * TILE, py = ty * TILE;
  g.fillStyle = '#8a857b'; // mortar
  g.fillRect(px, py, TILE, TILE);
  const tones = ['#a8a397', '#b1ac9f', '#9f9a8e', '#aca699'];
  for (let r = 0; r < 4; r++) {
    const off = r % 2 ? 4 : 0;
    for (let c = -1; c < 4; c++) {
      const cx = px + c * 8 + off;
      g.fillStyle = tones[Math.floor(hash(tx, ty, r * 5 + c + 1) * tones.length)];
      const x = Math.max(px, cx + 1), w = Math.min(px + TILE, cx + 8) - x;
      if (w > 0) rrect(g, x, py + r * 8 + 1, w, 6, 2);
    }
  }
}

function paintLot(g, tx, ty) {
  const px = tx * TILE, py = ty * TILE;
  g.fillStyle = '#9b7b52';
  g.fillRect(px, py, TILE, TILE);
  g.fillStyle = '#8a6b45';
  for (let i = 0; i < 4; i++) g.fillRect(px + hash(tx, ty, i) * 28, py + hash(ty, tx, i) * 28, 3, 2);
  g.fillStyle = '#6aa04f'; // a few weeds
  if (hash(tx, ty, 9) < 0.3) g.fillRect(px + hash(tx, ty, 10) * 26, py + hash(tx, ty, 11) * 26, 2, 4);
}

function paintLotBorder(g, lot) {
  const x = lot.x * TILE + 4, y = lot.y * TILE + 4;
  const w = lot.w * TILE - 8, h = lot.h * TILE - 8;
  g.strokeStyle = '#e3d3a6'; // rope
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w, h);
  g.fillStyle = '#6b4423'; // stakes
  for (const [sx, sy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) g.fillRect(sx - 2, sy - 4, 4, 7);
}

// ---- Props ----

function drawFountain(ctx, cx, by) {
  const t = performance.now() / 1000;
  const cy = by - 30; // basin center
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, cx, cy + 6, 33, 21);
  ctx.fillStyle = '#7f838b';
  ellipse(ctx, cx, cy + 2, 31, 20);
  ctx.fillStyle = '#b4b8c0';
  ellipse(ctx, cx, cy - 1, 31, 19);
  ctx.fillStyle = '#3d7fc4';
  ellipse(ctx, cx, cy, 25, 14);

  // ripples
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.5 + i / 2) % 1;
    ctx.strokeStyle = `rgba(230,245,255,${0.5 * (1 - p)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 6 + p * 17, 3 + p * 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // pillar + top bowl
  ctx.fillStyle = '#9a9ea6';
  ctx.fillRect(cx - 4, cy - 24, 8, 24);
  ctx.fillStyle = '#80848c';
  ctx.fillRect(cx + 1, cy - 24, 3, 24);
  ctx.fillStyle = '#b4b8c0';
  ellipse(ctx, cx, cy - 24, 11, 4);
  ctx.fillStyle = '#5c9bd8';
  ellipse(ctx, cx, cy - 25, 8, 2.5);

  // spray
  ctx.fillStyle = '#d6ecff';
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1;
    const p = (t * 1.3 + i / 10) % 1;
    const dx = side * p * 12;
    const dy = -10 * Math.sin(p * Math.PI) + p * 8;
    ctx.fillRect(cx + dx - 1, cy - 28 + dy, 2, 2);
  }
}

function drawLamp(ctx, cx, by) {
  ctx.fillStyle = 'rgba(255, 220, 120, 0.16)';
  circle(ctx, cx, by - 50, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, cx, by - 4, 6, 2.5);
  ctx.fillStyle = '#2e2e35';
  ctx.fillRect(cx - 4, by - 8, 8, 4);
  ctx.fillRect(cx - 1.5, by - 44, 3, 38);
  rrect(ctx, cx - 5, by - 56, 10, 13, 2);
  ctx.fillStyle = '#ffe08a';
  ctx.fillRect(cx - 3, by - 54, 6, 9);
  ctx.fillStyle = '#2e2e35';
  ctx.beginPath();
  ctx.moveTo(cx - 7, by - 56);
  ctx.lineTo(cx + 7, by - 56);
  ctx.lineTo(cx, by - 62);
  ctx.closePath();
  ctx.fill();
}

function drawLotSign(ctx, cx, by) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, cx, by - 4, 6, 2.5);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(cx - 1.5, by - 24, 3, 20);
  ctx.fillStyle = '#7a5233';
  rrect(ctx, cx - 12, by - 32, 24, 14, 2);
  ctx.fillStyle = '#d8b67e';
  rrect(ctx, cx - 11, by - 31, 22, 12, 2);
  ctx.fillStyle = '#4a2f1d';
  ctx.font = 'bold 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FOR', cx, by - 28);
  ctx.fillText('SALE', cx, by - 22);
  ctx.textAlign = 'start';
}

function drawWelcomeSign(ctx, cx, by) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, cx, by - 4, 26, 3);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(cx - 22, by - 30, 3, 26);
  ctx.fillRect(cx + 19, by - 30, 3, 26);
  ctx.fillStyle = '#7a5233';
  rrect(ctx, cx - 29, by - 40, 58, 20, 3);
  ctx.fillStyle = '#d8b67e';
  rrect(ctx, cx - 27, by - 38, 54, 16, 2);
  ctx.fillStyle = '#4a2f1d';
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MARKET', cx, by - 34);
  ctx.fillText('SQUARE', cx, by - 26);
  ctx.textAlign = 'start';
}
