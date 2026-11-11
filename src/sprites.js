// Procedural drawing for world props. Everything is drawn with canvas shapes for now,
// so we can swap in real pixel art later without touching game logic.
import { circle, ellipse, rrect } from './utils.js';

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

export function drawRock(ctx, o) {
  const { x, y } = o;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, x, y - 3, 13, 4);
  ctx.fillStyle = '#7d8088';
  rrect(ctx, x - 12, y - 18, 24, 16, 7);
  ctx.fillStyle = '#9a9ea6';
  rrect(ctx, x - 9, y - 17, 14, 7, 4);
}

// ---- Furniture (x, y = top-left of footprint, w/h in px) ----

export const furnitureDrawers = {
  bed(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    rrect(ctx, x + 3, y + 4, w - 4, h - 4, 4);
    ctx.fillStyle = '#6b3f22';
    rrect(ctx, x + 2, y - 4, w - 4, h + 2, 4);
    ctx.fillStyle = '#4e2d17';
    rrect(ctx, x + 2, y - 6, w - 4, 9, 3); // headboard
    ctx.fillStyle = '#f4f1ea';
    rrect(ctx, x + 6, y + 5, w - 12, 11, 4); // pillow
    ctx.fillStyle = '#3a6ea5';
    rrect(ctx, x + 4, y + 19, w - 8, h - 23, 3); // blanket
    ctx.fillStyle = '#6a9bd1';
    ctx.fillRect(x + 4, y + 19, w - 8, 4);
  },

  bookshelf(ctx, x, y, w, h) {
    const top = y - 20; // leans up against the back wall
    ctx.fillStyle = '#4a2f1d';
    rrect(ctx, x + 2, top, w - 4, h + 16, 3);
    const colors = ['#b03a2e', '#2e86c1', '#d4ac0d', '#28b463', '#7d3c98', '#e67e22', '#ecf0f1'];
    const rows = 3, rowH = (h + 6) / rows;
    for (let r = 0; r < rows; r++) {
      const ry = top + 4 + r * rowH;
      ctx.fillStyle = '#2e1b0f';
      ctx.fillRect(x + 5, ry, w - 10, rowH - 3);
      let bx = x + 6;
      let i = r * 3;
      while (bx < x + w - 9) {
        const bw = 3 + ((i * 7) % 3);
        const bh = rowH - 4 - ((i * 5) % 3);
        ctx.fillStyle = colors[(i * 3 + r) % colors.length];
        ctx.fillRect(bx, ry + (rowH - 3 - bh), bw, bh);
        bx += bw + 1;
        i++;
      }
    }
  },

  chest(ctx, x, y, w, h, state) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, x + w / 2, y + h - 3, 13, 4);
    if (state?.open) {
      // lid swung up behind the box, dark inside showing
      ctx.fillStyle = '#7a4d24';
      rrect(ctx, x + 4, y - 4, w - 8, 11, 3);
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(x + 8, y - 4, 3, 11);
      ctx.fillRect(x + w - 11, y - 4, 3, 11);
      ctx.fillStyle = '#8b5a2b';
      rrect(ctx, x + 4, y + 8, w - 8, h - 12, 3);
      ctx.fillStyle = '#2a1708';
      ctx.fillRect(x + 6, y + 8, w - 12, 5);
      ctx.fillStyle = '#e1b941'; // glint of treasure
      ctx.fillRect(x + 11, y + 9, 3, 2);
      ctx.fillRect(x + 18, y + 10, 2, 2);
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(x + 8, y + 13, 3, h - 17);
      ctx.fillRect(x + w - 11, y + 13, 3, h - 17);
      return;
    }
    ctx.fillStyle = '#8b5a2b';
    rrect(ctx, x + 4, y + 6, w - 8, h - 10, 3);
    ctx.fillStyle = '#a86d35';
    rrect(ctx, x + 4, y + 6, w - 8, 9, 3); // lid
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 8, y + 6, 3, h - 10);
    ctx.fillRect(x + w - 11, y + 6, 3, h - 10);
    ctx.fillStyle = '#e1b941';
    ctx.fillRect(x + w / 2 - 2, y + 13, 4, 5);
  },

  table(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, x + w / 2, y + h - 4, 13, 4);
    ctx.fillStyle = '#5e3b1f';
    ctx.fillRect(x + 7, y + 14, 3, h - 18);
    ctx.fillRect(x + w - 10, y + 14, 3, h - 18);
    ctx.fillStyle = '#9c6b3e';
    rrect(ctx, x + 3, y + 3, w - 6, 14, 4);
    ctx.fillStyle = '#b5824f';
    rrect(ctx, x + 3, y + 3, w - 6, 4, 2);
    ctx.fillStyle = '#e8e2d5'; // mug
    ctx.fillRect(x + 18, y + 4, 5, 6);
  },

  /** Old cathedral-style tube radio on a little stand. */
  radio(ctx, x, y, w, h, radio) {
    const cx = x + w / 2;
    const t = performance.now() / 1000;

    // stand
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, cx, y + h - 3, 12, 4);
    ctx.fillStyle = '#5e3b1f';
    ctx.fillRect(x + 7, y + 16, 3, h - 19);
    ctx.fillRect(x + w - 10, y + 16, 3, h - 19);
    ctx.fillStyle = '#7a4d2a';
    rrect(ctx, x + 4, y + 13, w - 8, 5, 2);

    // cabinet: arched top
    const top = y - 8, bottom = y + 14, r = 11;
    ctx.fillStyle = '#4a2a14';
    ctx.beginPath();
    ctx.arc(cx, top + r, r + 1, Math.PI, 0);
    ctx.lineTo(cx + r + 1, bottom);
    ctx.lineTo(cx - r - 1, bottom);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a552b';
    ctx.beginPath();
    ctx.arc(cx, top + r, r, Math.PI, 0);
    ctx.lineTo(cx + r, bottom - 1);
    ctx.lineTo(cx - r, bottom - 1);
    ctx.closePath();
    ctx.fill();

    // speaker grille
    ctx.fillStyle = '#d6c08e';
    ctx.beginPath();
    ctx.arc(cx, top + r + 1, 7, Math.PI, 0);
    ctx.lineTo(cx + 7, top + r + 7);
    ctx.lineTo(cx - 7, top + r + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b4020';
    for (let i = -4; i <= 4; i += 3) ctx.fillRect(cx + i, top + r - 5, 1, 12);

    // dial: glows when on, flickers while tuning
    let glow = '#4d3d2a';
    if (radio.state === 'playing') glow = '#ffcf5c';
    else if (radio.state === 'tuning') glow = Math.sin(t * 25) > 0 ? '#ffcf5c' : '#a8843a';
    if (radio.state !== 'off') {
      ctx.fillStyle = 'rgba(255, 200, 90, 0.25)';
      ellipse(ctx, cx, bottom - 6, 9, 5);
    }
    ctx.fillStyle = glow;
    rrect(ctx, cx - 5, bottom - 8, 10, 4, 1.5);
    ctx.fillStyle = '#7a1f12';
    const needle = radio.state === 'tuning' ? Math.sin(t * 6) * 3.5 : 1;
    ctx.fillRect(cx + needle, bottom - 8, 1, 4);

    // knobs
    ctx.fillStyle = '#2b1a0e';
    circle(ctx, cx - 8, bottom - 6, 2);
    circle(ctx, cx + 8, bottom - 6, 2);

    // floating music notes while playing
    if (radio.state === 'playing') {
      ctx.font = 'bold 10px serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.5 + i / 3) % 1;
        ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9;
        ctx.fillStyle = i % 2 ? '#f7e3a3' : '#ffffff';
        ctx.fillText(i % 2 ? '♫' : '♪', cx + 8 + Math.sin(p * 6 + i) * 5, top - 2 - p * 22);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }
  },

  plant(ctx, x, y, w, h) {
    const cx = x + w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, cx, y + h - 4, 9, 3);
    ctx.fillStyle = '#b5562f';
    ctx.beginPath();
    ctx.moveTo(cx - 8, y + 16);
    ctx.lineTo(cx + 8, y + 16);
    ctx.lineTo(cx + 6, y + h - 4);
    ctx.lineTo(cx - 6, y + h - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2f7a35';
    circle(ctx, cx - 5, y + 10, 6);
    circle(ctx, cx + 5, y + 9, 6);
    ctx.fillStyle = '#45a047';
    circle(ctx, cx, y + 4, 6);
  },
};
