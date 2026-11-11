// Procedural drawings for outdoor world props: trees, stumps, rocks.
// Everything is drawn with canvas shapes for now, so we can swap in pixel art later.
import { circle, ellipse, rrect } from '../core/utils.js';

export function drawTree(ctx, o) {
  const { x, y, s } = o; // x = trunk center, y = base
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, x, y - 2, 15 * s, 5 * s);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - 4 * s, y - 18 * s, 8 * s, 17 * s);
  ctx.fillStyle = '#4f321a';
  ctx.fillRect(x + 1 * s, y - 18 * s, 3 * s, 17 * s);
  ctx.fillStyle = '#2b6331';
  circle(ctx, x, y - 30 * s, 17 * s);
  ctx.fillStyle = '#3a823b';
  circle(ctx, x - 7 * s, y - 34 * s, 12 * s);
  ctx.fillStyle = '#4b9a45';
  circle(ctx, x + 6 * s, y - 37 * s, 11 * s);
  ctx.fillStyle = '#6cbf5a';
  circle(ctx, x - 4 * s, y - 41 * s, 5 * s);
}

export function drawStump(ctx, x, y, s = 1) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, x, y - 2, 9 * s, 3.5 * s);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - 5 * s, y - 8 * s, 10 * s, 7 * s);
  ctx.fillStyle = '#4f321a';
  ctx.fillRect(x + 2 * s, y - 8 * s, 3 * s, 7 * s);
  ctx.fillStyle = '#d9b07a';
  ellipse(ctx, x, y - 8 * s, 5 * s, 2.5 * s);
  ctx.strokeStyle = '#a77b4a';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.ellipse(x, y - 8 * s, 2.5 * s, 1.2 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawRock(ctx, o) {
  const { x, y } = o;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, x, y - 3, 13, 4);
  ctx.fillStyle = '#7d8088';
  rrect(ctx, x - 12, y - 18, 24, 16, 7);
  ctx.fillStyle = '#9a9ea6';
  rrect(ctx, x - 9, y - 17, 14, 7, 4);
}
