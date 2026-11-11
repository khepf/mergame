// Shops: what they trade, plus the building, counter and merchant NPC drawn on a town lot.
import { TILE } from '../core/constants.js';
import { circle, ellipse, rrect } from '../core/utils.js';

// Prices are in bronze (see money.js).
export const GENERAL_STORE = {
  name: 'General Store',
  merchant: 'Bram',
  greeting: "Welcome, welcome! I'm always short on wood. Got any to sell?",
  buys: { wood: 1 }, // item type -> what the merchant pays per item
  sells: [{ type: 'apple', price: 3 }], // what the merchant has for sale (placeholder stock)
};

const TRADE_RANGE = 72; // px: how close you must be to the merchant to trade

/**
 * Turn a town lot into a store. Layout (lot is 7x5 tiles):
 *   rows 0-2: the shop building (roof + storefront facing the street)
 *   row  3  : the merchant, standing behind...
 *   row  4  : ...the counter, with barrels at either end
 * The street-side row just past the lot is where the player stands to trade.
 */
export function buildStore(world, lot, def) {
  for (let ty = lot.y; ty < lot.y + lot.h; ty++)
    for (let tx = lot.x; tx < lot.x + lot.w; tx++) world.block(tx, ty);

  const bx = lot.x * TILE, by = lot.y * TILE, bw = lot.w * TILE;
  const counterY = by + 4 * TILE; // top of the counter row

  const store = {
    def, lot,
    onMerchantClick: null, // set by the game: opens the shop UI

    /** Is the player close enough to the counter to trade? */
    inRange(player) {
      return Math.hypot(player.x - merchant.x, player.y - merchant.y) < TRADE_RANGE;
    },

    paintGround(g) {
      // Wooden deck under the whole shop
      for (let ty = lot.y; ty < lot.y + lot.h; ty++)
        for (let tx = lot.x; tx < lot.x + lot.w; tx++) {
          const px = tx * TILE, py = ty * TILE;
          g.fillStyle = '#b07a45';
          g.fillRect(px, py, TILE, TILE);
          g.fillStyle = '#93622f';
          for (let i = 0; i < 4; i++) {
            g.fillRect(px, py + i * 8 + 7, TILE, 1);
            g.fillRect(px + ((tx * 11 + ty * 5 + i * 13) % TILE), py + i * 8, 1, 7);
          }
        }
    },
  };

  world.addObject({ x: bx + bw / 2, y: by + 3 * TILE, draw: (ctx) => drawStoreBuilding(ctx, bx, by, bw, def.name) });

  const merchant = {
    kind: 'npc',
    name: def.merchant,
    x: bx + bw / 2,
    y: counterY + 2, // feet (hidden behind the counter)
    near: false, // player within trading range: show a speech bubble
    draw(ctx) { drawMerchant(ctx, this); },
    canInteract: () => true,
    onClick: () => store.onMerchantClick?.(),
  };
  merchant.hitbox = { x: merchant.x - 14, y: merchant.y - 38, w: 28, h: 30 };
  store.merchant = merchant;
  world.addObject(merchant);

  world.addObject({ x: bx + bw / 2, y: counterY + TILE - 1, draw: (ctx) => drawCounter(ctx, bx, counterY, bw) });
  return store;
}

// ---- Drawing ----

function drawStoreBuilding(ctx, bx, by, bw, name) {
  const fy = by + 2 * TILE; // facade row

  // Storefront
  ctx.fillStyle = '#dcc7a1';
  ctx.fillRect(bx, fy, bw, TILE);
  ctx.fillStyle = '#c4ad86';
  for (let i = 1; i < 5; i++) ctx.fillRect(bx, fy + i * 5, bw, 1);
  ctx.fillStyle = '#7d7d7d';
  ctx.fillRect(bx, fy + TILE - 5, bw, 5);

  // Display windows with goods on shelves
  for (const wx of [bx + 18, bx + bw - 18 - 60]) {
    ctx.fillStyle = '#5b3a24';
    ctx.fillRect(wx, fy + 3, 60, 22);
    ctx.fillStyle = '#a9d8ef';
    ctx.fillRect(wx + 2, fy + 5, 56, 18);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(wx + 2, fy + 14, 56, 2);
    const goods = ['#c0392b', '#e1b941', '#28b463', '#7a4a26', '#2e86c1', '#e67e22'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = goods[i];
      ctx.fillRect(wx + 5 + i * 9, fy + 8 + (i % 2), 5, 6 - (i % 2));
      ctx.fillStyle = goods[(i + 3) % 6];
      ctx.fillRect(wx + 6 + i * 9, fy + 17, 4, 5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(wx + 4, fy + 6, 3, 16);
  }

  // Door
  const dx = bx + bw / 2 - 12;
  ctx.fillStyle = '#4a2f1d';
  ctx.fillRect(dx - 2, fy + 1, 28, TILE - 1);
  ctx.fillStyle = '#7a4a26';
  ctx.fillRect(dx, fy + 3, 24, TILE - 3);
  ctx.fillStyle = '#a9d8ef';
  ctx.fillRect(dx + 5, fy + 6, 14, 8);
  ctx.fillStyle = '#e1b941';
  ctx.fillRect(dx + 18, fy + 19, 2, 2);

  // Roof (green shingles) over the back two rows
  const rt = by - 22, rh = 2 * TILE + 26;
  const ridge = rt + Math.round(rh * 0.42);
  ctx.fillStyle = '#285c44';
  ctx.fillRect(bx - 6, rt, bw + 12, ridge - rt);
  ctx.fillStyle = '#3a8060';
  ctx.fillRect(bx - 6, ridge, bw + 12, rt + rh - ridge);
  for (let yy = rt; yy < rt + rh; yy += 9) {
    ctx.fillStyle = yy >= ridge ? '#2f6b4f' : '#1f4a36';
    ctx.fillRect(bx - 6, yy, bw + 12, 1);
    const off = ((yy - rt) / 9) % 2 ? 6 : 0;
    for (let xx = bx - 6 + off; xx < bx + bw + 6; xx += 12) ctx.fillRect(xx, yy, 1, 9);
  }
  ctx.fillStyle = '#1f4a36';
  ctx.fillRect(bx - 6, ridge - 3, bw + 12, 6);
  ctx.fillRect(bx - 6, rt + rh - 5, bw + 12, 5);

  // Shop sign hanging over the door
  const sw = 112, sx = bx + bw / 2 - sw / 2, sy = fy - 22;
  ctx.fillStyle = '#4a2f1d';
  rrect(ctx, sx, sy, sw, 20, 3);
  ctx.fillStyle = '#f0dcb0';
  rrect(ctx, sx + 2, sy + 2, sw - 4, 16, 2);
  ctx.fillStyle = '#5b3a24';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), bx + bw / 2, sy + 10.5);
  ctx.textAlign = 'start';
}

function drawCounter(ctx, bx, rowY, bw) {
  const cx0 = bx + TILE, cw = bw - 2 * TILE;

  // Barrels at both ends
  for (const x of [bx + TILE / 2, bx + bw - TILE / 2]) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, x, rowY + TILE - 3, 12, 4);
    ctx.fillStyle = '#8b5a2b';
    rrect(ctx, x - 11, rowY - 6, 22, TILE + 2, 6);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x - 11, rowY + 1, 22, 2);
    ctx.fillRect(x - 11, rowY + 18, 22, 2);
    ctx.fillStyle = '#a86d35';
    ellipse(ctx, x, rowY - 5, 10, 4);
  }

  // Counter
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx0 + 2, rowY + TILE - 4, cw - 4, 4);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(cx0, rowY, cw, TILE - 4);
  ctx.fillStyle = '#74491f';
  for (let x = cx0 + 16; x < cx0 + cw; x += 16) ctx.fillRect(x, rowY + 2, 1, TILE - 8);
  ctx.fillStyle = '#b5824f';
  ctx.fillRect(cx0 - 2, rowY - 10, cw + 4, 11);
  ctx.fillStyle = '#c99561';
  ctx.fillRect(cx0 - 2, rowY - 10, cw + 4, 3);

  // Goods on the counter: apples, a little log pile, a dish of coins
  ctx.fillStyle = '#c0392b';
  circle(ctx, cx0 + 14, rowY - 10, 3.5);
  circle(ctx, cx0 + 20, rowY - 11, 3.5);
  circle(ctx, cx0 + 17, rowY - 14, 3.5);
  ctx.fillStyle = '#7a4a26';
  ctx.fillRect(cx0 + cw - 34, rowY - 14, 14, 4);
  ctx.fillRect(cx0 + cw - 32, rowY - 18, 12, 4);
  ctx.fillStyle = '#d9b07a';
  ctx.fillRect(cx0 + cw - 20, rowY - 14, 2, 4);
  ctx.fillRect(cx0 + cw - 20, rowY - 18, 2, 4);
  ctx.fillStyle = '#9aa0a8';
  ellipse(ctx, cx0 + cw - 10, rowY - 9, 6, 2.5);
  ctx.fillStyle = '#f4c542';
  circle(ctx, cx0 + cw - 12, rowY - 10, 1.8);
  circle(ctx, cx0 + cw - 8, rowY - 11, 1.8);
}

function drawMerchant(ctx, m) {
  const t = performance.now() / 1000;
  const x = Math.round(m.x), y = m.y;
  const by = y - 8 + Math.sin(t * 2) * 0.6; // torso bottom, gentle idle breathing

  // Arms
  ctx.fillStyle = '#2f6b3f';
  ctx.fillRect(x - 10, by - 11, 3, 9);
  ctx.fillRect(x + 7, by - 11, 3, 9);
  // Shirt + apron
  ctx.fillStyle = '#3c7a4a';
  rrect(ctx, x - 7, by - 13, 14, 14, 3);
  ctx.fillStyle = '#f2ede1';
  rrect(ctx, x - 5, by - 10, 10, 11, 2);
  ctx.fillStyle = '#d6cfbd';
  ctx.fillRect(x - 5, by - 10, 10, 1);

  // Head
  const hy = by - 19;
  ctx.fillStyle = '#e8b98a';
  circle(ctx, x, hy, 7);
  // Grey hair, thinning on top
  ctx.fillStyle = '#b5b5b5';
  ctx.fillRect(x - 7.5, hy - 3, 3, 6);
  ctx.fillRect(x + 4.5, hy - 3, 3, 6);
  ctx.beginPath();
  ctx.arc(x, hy - 2, 7, Math.PI * 1.1, Math.PI * 1.9);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#b5b5b5';
  ctx.stroke();
  // Eyes (blink every few seconds) + bushy moustache
  ctx.fillStyle = '#222';
  if (t % 4 < 0.12) {
    ctx.fillRect(x - 4, hy + 1, 2, 1);
    ctx.fillRect(x + 2, hy + 1, 2, 1);
  } else {
    ctx.fillRect(x - 4, hy, 2, 3);
    ctx.fillRect(x + 2, hy, 2, 3);
  }
  ctx.fillStyle = '#9a9a9a';
  rrect(ctx, x - 5, hy + 3.5, 10, 3, 1.5);

  // Speech bubble with a coin when the player is close enough to trade
  if (m.near) {
    const bx = x + 9, bby = hy - 18 + Math.sin(t * 3) * 1;
    ctx.fillStyle = '#fff';
    rrect(ctx, bx, bby, 14, 12, 4);
    ctx.beginPath();
    ctx.moveTo(bx + 2, bby + 10);
    ctx.lineTo(bx - 1, bby + 15);
    ctx.lineTo(bx + 6, bby + 11);
    ctx.fill();
    ctx.fillStyle = '#f4c542';
    circle(ctx, bx + 7, bby + 6, 3.5);
    ctx.fillStyle = '#c99a1e';
    ctx.fillRect(bx + 6, bby + 4, 2, 4);
  }
}
