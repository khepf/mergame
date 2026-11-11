// The Bank: a stone building with a teller who keeps your coins safe.
// Same lot layout as the store (building rows 0-2, teller row 3, counter row 4).
import { TILE } from '../core/constants.js';
import { circle, ellipse, rrect } from '../core/utils.js';

export const BANK = {
  name: 'Bank',
  teller: 'Penelope',
  greeting: 'Good day! Your coins are safe with us. Deposit or withdraw any amount.',
};

const TELLER_RANGE = 72; // px

export function buildBank(world, lot) {
  for (let ty = lot.y; ty < lot.y + lot.h; ty++)
    for (let tx = lot.x; tx < lot.x + lot.w; tx++) world.block(tx, ty);

  const bx = lot.x * TILE, by = lot.y * TILE, bw = lot.w * TILE;
  const counterY = by + 4 * TILE;

  const bank = {
    def: BANK, lot,
    onTellerClick: null, // set by the game: opens the bank UI

    inRange(player) {
      return Math.hypot(player.x - teller.x, player.y - teller.y) < TELLER_RANGE;
    },

    paintGround(g) {
      // Polished marble floor
      for (let ty = lot.y; ty < lot.y + lot.h; ty++)
        for (let tx = lot.x; tx < lot.x + lot.w; tx++) {
          const px = tx * TILE, py = ty * TILE;
          for (let qy = 0; qy < 2; qy++)
            for (let qx = 0; qx < 2; qx++) {
              g.fillStyle = (qx + qy + tx + ty) % 2 ? '#e4dfd3' : '#cfc8b8';
              g.fillRect(px + qx * 16, py + qy * 16, 16, 16);
            }
        }
    },
  };

  world.addObject({ x: bx + bw / 2, y: by + 3 * TILE, draw: (ctx) => drawBankBuilding(ctx, bx, by, bw) });

  const teller = {
    kind: 'npc',
    name: BANK.teller,
    x: bx + bw / 2,
    y: counterY + 2,
    near: false,
    draw(ctx) { drawTeller(ctx, this); },
    canInteract: () => true,
    onClick: () => bank.onTellerClick?.(),
  };
  teller.hitbox = { x: teller.x - 14, y: teller.y - 40, w: 28, h: 32 };
  bank.teller = teller;
  world.addObject(teller);

  world.addObject({ x: bx + bw / 2, y: counterY + TILE - 1, draw: (ctx) => drawTellerCounter(ctx, bx, counterY, bw) });
  return bank;
}

// ---- Drawing ----

function drawBankBuilding(ctx, bx, by, bw) {
  const fy = by + 2 * TILE; // facade row
  const cx = bx + bw / 2;

  // Stone facade
  ctx.fillStyle = '#d9d4c7';
  ctx.fillRect(bx, fy - 6, bw, TILE + 6);
  ctx.fillStyle = '#c6c0b1';
  for (let i = 0; i < 6; i++) ctx.fillRect(bx, fy - 6 + i * 7, bw, 1);
  ctx.fillStyle = '#a8a294';
  ctx.fillRect(bx, fy + TILE - 6, bw, 6); // plinth

  // Columns
  for (const colX of [bx + 14, bx + 50, bx + bw - 64, bx + bw - 28]) {
    ctx.fillStyle = '#f2efe7';
    ctx.fillRect(colX, fy - 4, 14, TILE - 2);
    ctx.fillStyle = '#dcd7cb';
    ctx.fillRect(colX + 3, fy - 4, 2, TILE - 2);
    ctx.fillRect(colX + 9, fy - 4, 2, TILE - 2);
    ctx.fillStyle = '#c9c3b5';
    ctx.fillRect(colX - 2, fy - 6, 18, 3); // capital
    ctx.fillRect(colX - 2, fy + TILE - 8, 18, 3); // base
  }

  // Big double doors with brass trim
  ctx.fillStyle = '#3a2615';
  ctx.fillRect(cx - 18, fy - 2, 36, TILE + 2);
  ctx.fillStyle = '#5b3a24';
  ctx.fillRect(cx - 16, fy, 15, TILE - 2);
  ctx.fillRect(cx + 1, fy, 15, TILE - 2);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(cx - 3, fy + 12, 2, 4);
  ctx.fillRect(cx + 1, fy + 12, 2, 4);
  ctx.fillRect(cx - 18, fy - 3, 36, 2);

  // Slate roof
  const rt = by - 18, rh = 2 * TILE + 14;
  ctx.fillStyle = '#4f5b68';
  ctx.fillRect(bx - 6, rt, bw + 12, rh);
  ctx.fillStyle = '#5d6b7a';
  ctx.fillRect(bx - 6, rt + rh * 0.45, bw + 12, rh * 0.55);
  ctx.fillStyle = '#46515d';
  for (let yy = rt; yy < rt + rh; yy += 8) {
    ctx.fillRect(bx - 6, yy, bw + 12, 1);
    const off = ((yy - rt) / 8) % 2 ? 5 : 0;
    for (let xx = bx - 6 + off; xx < bx + bw + 6; xx += 10) ctx.fillRect(xx, yy, 1, 8);
  }

  // Classical pediment over the entrance, with the name carved in
  const pw = 150, ph = 34, pBase = fy - 4;
  ctx.fillStyle = '#c9c3b5';
  ctx.beginPath();
  ctx.moveTo(cx - pw / 2 - 4, pBase);
  ctx.lineTo(cx, pBase - ph - 4);
  ctx.lineTo(cx + pw / 2 + 4, pBase);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ebe7dd';
  ctx.beginPath();
  ctx.moveTo(cx - pw / 2, pBase - 2);
  ctx.lineTo(cx, pBase - ph);
  ctx.lineTo(cx + pw / 2, pBase - 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c9c3b5';
  ctx.fillRect(bx - 2, pBase - 2, bw + 4, 4); // cornice

  ctx.fillStyle = '#6b5a2e';
  ctx.font = 'bold 10px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BANK', cx, pBase - 11);
  ctx.textAlign = 'start';
  // Gold coin emblem at the peak
  ctx.fillStyle = '#d4af37';
  circle(ctx, cx, pBase - 24, 4);
  ctx.fillStyle = '#b8932a';
  ctx.fillRect(cx - 0.5, pBase - 26, 1, 4);
}

function drawTellerCounter(ctx, bx, rowY, bw) {
  const cx0 = bx + TILE, cw = bw - 2 * TILE, mid = bx + bw / 2;

  // Potted plants at both ends
  for (const x of [bx + TILE / 2, bx + bw - TILE / 2]) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, x, rowY + TILE - 3, 10, 3.5);
    ctx.fillStyle = '#8a8e96';
    ctx.beginPath();
    ctx.moveTo(x - 9, rowY + 6);
    ctx.lineTo(x + 9, rowY + 6);
    ctx.lineTo(x + 7, rowY + TILE - 3);
    ctx.lineTo(x - 7, rowY + TILE - 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2f7a35';
    circle(ctx, x - 5, rowY - 1, 7);
    circle(ctx, x + 5, rowY - 2, 7);
    ctx.fillStyle = '#45a047';
    circle(ctx, x, rowY - 8, 7);
  }

  // Dark wood counter with a marble top
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(cx0 + 2, rowY + TILE - 4, cw - 4, 4);
  ctx.fillStyle = '#4a2f1d';
  ctx.fillRect(cx0, rowY, cw, TILE - 4);
  ctx.fillStyle = '#5b3a24';
  for (let x = cx0 + 6; x < cx0 + cw - 20; x += 32) ctx.fillRect(x, rowY + 4, 26, TILE - 12); // panels
  ctx.fillStyle = '#e8e4da';
  ctx.fillRect(cx0 - 2, rowY - 10, cw + 4, 11);
  ctx.fillStyle = '#f7f4ee';
  ctx.fillRect(cx0 - 2, rowY - 10, cw + 4, 3);

  // Brass teller cage, with an open window in front of the teller
  ctx.fillStyle = '#c9a43a';
  ctx.fillRect(cx0, rowY - 40, cw, 3); // top rail
  for (let x = cx0 + 2; x < cx0 + cw; x += 8) {
    if (Math.abs(x - mid) < 16) continue;
    ctx.fillRect(x, rowY - 38, 1.5, 28);
  }
  ctx.fillStyle = '#b08c2c';
  ctx.fillRect(mid - 17, rowY - 38, 2, 28); // window frame
  ctx.fillRect(mid + 15, rowY - 38, 2, 28);

  // A neat stack of coins and a little bell on the counter
  ctx.fillStyle = '#d4af37';
  for (let i = 0; i < 4; i++) ellipse(ctx, cx0 + 18, rowY - 8 - i * 2, 5, 2);
  ctx.fillStyle = '#c9ced6';
  for (let i = 0; i < 3; i++) ellipse(ctx, cx0 + 30, rowY - 8 - i * 2, 5, 2);
  ctx.fillStyle = '#c9a43a';
  ctx.beginPath();
  ctx.arc(cx0 + cw - 16, rowY - 7, 4, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx0 + cw - 17, rowY - 13, 2, 2);
}

function drawTeller(ctx, m) {
  const t = performance.now() / 1000;
  const x = Math.round(m.x), y = m.y;
  const by = y - 8 + Math.sin(t * 2 + 1) * 0.6;

  // Arms
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(x - 10, by - 11, 3, 9);
  ctx.fillRect(x + 7, by - 11, 3, 9);
  // White shirt + navy vest
  ctx.fillStyle = '#f4f1ea';
  rrect(ctx, x - 7, by - 13, 14, 14, 3);
  ctx.fillStyle = '#2c3e64';
  ctx.fillRect(x - 7, by - 12, 5, 13);
  ctx.fillRect(x + 2, by - 12, 5, 13);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(x - 3, by - 6, 1, 1);
  ctx.fillRect(x - 3, by - 3, 1, 1);

  // Head
  const hy = by - 19;
  ctx.fillStyle = '#c68e62';
  circle(ctx, x, hy, 7);
  // Auburn hair pulled up into a small bun
  ctx.fillStyle = '#7a3b1e';
  circle(ctx, x, hy - 8, 3);
  ctx.beginPath();
  ctx.arc(x, hy - 1, 7.5, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 7.5, hy - 2, 2.5, 5);
  ctx.fillRect(x + 5, hy - 2, 2.5, 5);
  // Green eyeshade visor
  ctx.fillStyle = 'rgba(46, 160, 90, 0.85)';
  ctx.fillRect(x - 8, hy - 4, 16, 3);
  // Round glasses + eyes (blink now and then)
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x - 3, hy + 1.5, 2.3, 0, Math.PI * 2);
  ctx.moveTo(x + 5.3, hy + 1.5);
  ctx.arc(x + 3, hy + 1.5, 2.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#222';
  if ((t + 1.7) % 5 < 0.12) {
    ctx.fillRect(x - 4, hy + 1.5, 2, 0.8);
    ctx.fillRect(x + 2, hy + 1.5, 2, 0.8);
  } else {
    ctx.fillRect(x - 3.5, hy + 0.5, 1.5, 2);
    ctx.fillRect(x + 2.5, hy + 0.5, 1.5, 2);
  }
  ctx.fillStyle = '#9c5a4a';
  ctx.fillRect(x - 1.5, hy + 4.5, 3, 1); // smile

  // Speech bubble with a coin when the player can bank
  if (m.near) {
    const bx = x + 9, bby = hy - 20 + Math.sin(t * 3) * 1;
    ctx.fillStyle = '#fff';
    rrect(ctx, bx, bby, 14, 12, 4);
    ctx.beginPath();
    ctx.moveTo(bx + 2, bby + 10);
    ctx.lineTo(bx - 1, bby + 15);
    ctx.lineTo(bx + 6, bby + 11);
    ctx.fill();
    ctx.fillStyle = '#d4af37';
    circle(ctx, bx + 7, bby + 6, 3.5);
    ctx.fillStyle = '#b8932a';
    ctx.fillRect(bx + 6, bby + 4, 2, 4);
  }
}
