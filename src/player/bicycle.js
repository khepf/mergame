// A rideable bicycle. While parked it's a world object; while ridden, the player draws it.
import { ellipse } from '../core/utils.js';

export const WHEEL_R = 7;
const FRAME = '#c0392b';
const TIRE = '#222';

export class Bicycle {
  constructor(x, y, facing = 'right') {
    this.x = x; // ground point under the bike's center
    this.y = y;
    this.facing = facing;
    this.ridden = false;
  }

  get hitbox() {
    return this.ridden ? null : { x: this.x - 18, y: this.y - 28, w: 36, h: 30 };
  }

  draw(ctx) {
    if (this.ridden) return;
    drawBike(ctx, this.x, this.y, this.facing, 0, true);
  }
}

/** Draw a bike at ground point (x, y). Returns pedal geometry for side views. */
export function drawBike(ctx, x, y, dir, wheelAngle, parked = false) {
  const side = dir === 'left' || dir === 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  if (side) ellipse(ctx, x, y - 1, 19, 3.5);
  else ellipse(ctx, x, y - 1, 6, 3.5);

  if (side) return drawBikeSide(ctx, x, y, dir === 'left' ? -1 : 1, wheelAngle, parked);
  drawBikeEnd(ctx, x, y, dir);
  return null;
}

function wheel(ctx, cx, cy, angle) {
  ctx.strokeStyle = TIRE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, WHEEL_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#9a9a9a';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a = angle + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a) * (WHEEL_R - 1), cy - Math.sin(a) * (WHEEL_R - 1));
    ctx.lineTo(cx + Math.cos(a) * (WHEEL_R - 1), cy + Math.sin(a) * (WHEEL_R - 1));
    ctx.stroke();
  }
  ctx.fillStyle = '#555';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

function line(ctx, ax, ay, bx, by) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

function drawBikeSide(ctx, x, y, f, angle, parked) {
  const hubY = y - WHEEL_R - 1;
  const rear = { x: x - f * 11, y: hubY };
  const front = { x: x + f * 11, y: hubY };
  const bb = { x: x - f * 1, y: hubY + 1 }; // bottom bracket (pedals)
  const seat = { x: x - f * 5, y: y - 20 };
  const head = { x: x + f * 7, y: y - 20 };
  const grip = { x: x + f * 5, y: y - 25 };

  wheel(ctx, rear.x, rear.y, angle);
  wheel(ctx, front.x, front.y, angle);

  ctx.lineCap = 'round';
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = 2;
  line(ctx, rear.x, rear.y, bb.x, bb.y); // chain stay
  line(ctx, rear.x, rear.y, seat.x, seat.y + 2); // seat stay
  line(ctx, bb.x, bb.y, seat.x, seat.y); // seat tube
  line(ctx, seat.x, seat.y + 2, head.x, head.y); // top tube
  line(ctx, bb.x, bb.y, head.x, head.y + 2); // down tube
  ctx.strokeStyle = '#8c8c8c';
  line(ctx, head.x, head.y, front.x, front.y); // fork
  line(ctx, head.x, head.y, grip.x, grip.y); // stem
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  line(ctx, grip.x, grip.y, grip.x - f * 3, grip.y); // grip
  ctx.fillStyle = '#333';
  ctx.fillRect(seat.x - 4, seat.y - 2, 8, 3); // saddle
  if (parked) {
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    line(ctx, bb.x - f * 2, bb.y, bb.x - f * 6, y); // kickstand
  }
  ctx.lineCap = 'butt';
  return { bb, seat, grip };
}

function drawBikeEnd(ctx, x, y, dir) {
  // Seen from the front (down) or back (up): a narrow upright wheel and handlebars.
  ctx.fillStyle = TIRE;
  ctx.fillRect(x - 2, y - 15, 4, 15);
  ctx.fillStyle = FRAME;
  ctx.fillRect(x - 1, y - 22, 2, 8);
  if (dir === 'up') drawHandlebar(ctx, x, y);
}

/** Handlebars for front/back views (drawn over the rider when facing down). */
export function drawHandlebar(ctx, x, y) {
  ctx.fillStyle = '#8c8c8c';
  ctx.fillRect(x - 9, y - 24, 18, 2);
  ctx.fillStyle = '#333';
  ctx.fillRect(x - 10, y - 25, 3, 4);
  ctx.fillRect(x + 7, y - 25, 3, 4);
}
