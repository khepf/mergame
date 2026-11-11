// The Bat Cave: a rocky hill north of Market Square with a cave you can walk into.
// Like the house roof, the hill's rock fades away when you step inside, and the cave is dark
// except for a pool of light around the player. Bats live here and respawn over time.
import { TILE, T } from '../core/constants.js';
import { mulberry32 } from '../core/utils.js';
import { drawRock } from '../world/props.js';
import { createBat, updateBat, drawBatEyes, BAT_SETTINGS } from '../world/bats.js';
import { paintCobbles } from './town.js';

const MOUTH_W = 3; // tiles

/**
 * Carve a cave into the hillside. (x0, y0, w, h) is the cave's tile rectangle; the path runs
 * from its mouth (bottom middle) down to the plaza. Uses its own RNG so the rest of the world
 * (and existing saves) stay exactly the same.
 */
export function buildCave(world, x0, y0, w, h, seed) {
  const rng = mulberry32(seed * 31 + 7);
  const town = world.town;
  const mouthX0 = x0 + Math.floor(w / 2) - Math.floor(MOUTH_W / 2);
  const hill = { x0: x0 - 4, y0, x1: x0 + w + 3, y1: town.y - 1 }; // cleared hillside (tiles, inclusive)

  // 1. Clear the hillside of trees and rocks
  for (const o of [...world.objects]) {
    if ((o.kind === 'tree' || o.kind === 'rock') &&
        o.tx >= hill.x0 && o.tx <= hill.x1 && o.ty >= hill.y0 && o.ty <= hill.y1) {
      world.removeObject(o);
      world.unblock(o.tx, o.ty);
    }
  }

  // 2. Carve the cave: a lumpy oval of floor, ringed by rock wall out to the edge of the
  //    (oval) hill. Corners of the rectangle outside the hill stay grass.
  const cx = x0 + w / 2, cy = y0 + h / 2;
  const hillRx = w / 2 - 0.6, hillRy = h / 2 - 0.4; // rock: kept inside the drawn hill
  const rx = w / 2 - 1.8, ry = h / 2 - 1.5; // open floor: always at least ~1 tile of rock around it
  const floorTiles = [];
  for (let ty = y0; ty < y0 + h; ty++) {
    for (let tx = x0; tx < x0 + w; tx++) {
      const hx = (tx + 0.5 - cx) / hillRx, hy = (ty + 0.5 - cy) / hillRy;
      if (hx * hx + hy * hy > 1) continue; // outside the hill
      const dx = (tx + 0.5 - cx) / rx, dy = (ty + 0.5 - cy) / ry;
      const isFloor = dx * dx + dy * dy < 1 + (rng() - 0.5) * 0.2;
      world.setTile(tx, ty, isFloor ? T.CAVE_FLOOR : T.CAVE_WALL);
    }
  }
  // The mouth: a passage from the bottom edge into the main chamber
  for (let ty = Math.floor(cy); ty < y0 + h; ty++) {
    for (let tx = mouthX0; tx < mouthX0 + MOUTH_W; tx++) world.setTile(tx, ty, T.CAVE_FLOOR);
    // Frame the passage with rock on both sides
    for (const tx of [mouthX0 - 1, mouthX0 + MOUTH_W]) if (world.getTile(tx, ty) !== T.CAVE_FLOOR) world.setTile(tx, ty, T.CAVE_WALL);
  }
  for (let ty = y0; ty < y0 + h; ty++)
    for (let tx = x0; tx < x0 + w; tx++) if (world.getTile(tx, ty) === T.CAVE_FLOOR) floorTiles.push([tx, ty]);

  // 3. Path from the cave mouth down to the plaza (between the store and the bank)
  for (let ty = y0 + h; ty < town.y; ty++)
    for (let tx = mouthX0; tx < mouthX0 + MOUTH_W; tx++) world.setTile(tx, ty, T.PATH);

  // 4. A few boulders scattered on the hillside
  for (let i = 0; i < 40; i++) {
    const tx = hill.x0 + Math.floor(rng() * (hill.x1 - hill.x0 + 1));
    const ty = hill.y0 + Math.floor(rng() * (hill.y1 - hill.y0 + 1));
    const nearPath = tx >= mouthX0 - 1 && tx <= mouthX0 + MOUTH_W && ty >= y0 + h - 1;
    const underHill = tx >= x0 - 1 && tx <= x0 + w && ty <= y0 + h;
    if (world.getTile(tx, ty) !== T.GRASS || world.isSolid(tx, ty) || nearPath || underHill || rng() < 0.75) continue;
    world.block(tx, ty);
    world.addObject({ kind: 'rock', tx, ty, x: (tx + 0.5) * TILE, y: (ty + 1) * TILE - 6, draw(ctx) { drawRock(ctx, this); } });
  }

  const cave = {
    x: x0, y: y0, w, h, hill,
    overlayAlpha: 1, // the hill's rock, faded out while you're inside
    darkness: 0, // 0..1 how dark the screen gets (inside only)
    bats: [],
    respawnTimer: 0,
    overlay: renderHill(w, h, mouthX0 - x0, rng),

    /** Is a point (feet, px) inside the cave? */
    contains(px, py) {
      return world.getTile(Math.floor(px / TILE), Math.floor(py / TILE)) === T.CAVE_FLOOR;
    },
    isFloorAt(px, py) {
      return this.contains(px, py);
    },
    inHillside(px, py) {
      const tx = px / TILE, ty = py / TILE;
      return tx >= hill.x0 && tx < hill.x1 + 1 && ty >= hill.y0 - 2 && ty < hill.y1 + 1;
    },
    randomFloorPoint() {
      const [tx, ty] = floorTiles[Math.floor(Math.random() * floorTiles.length)];
      return { x: (tx + 0.2 + Math.random() * 0.6) * TILE, y: (ty + 0.2 + Math.random() * 0.6) * TILE };
    },

    // ---- Bats ----

    /** Add a bat somewhere in the cave, preferably out of the player's sight. */
    spawnBat(player) {
      let p = this.randomFloorPoint();
      for (let i = 0; i < 20 && player && Math.hypot(p.x - player.x, p.y - player.y) < 180; i++) p = this.randomFloorPoint();
      const bat = createBat(p.x, p.y);
      this.bats.push(bat);
      world.addObject(bat);
    },
    removeBat(bat) {
      this.bats.splice(this.bats.indexOf(bat), 1);
      world.removeObject(bat);
      if (this.respawnTimer <= 0) this.respawnTimer = BAT_SETTINGS.respawnSeconds;
    },

    update(dt, player) {
      const inside = this.contains(player.x, player.y);
      const k = Math.min(1, dt * 6);
      this.overlayAlpha += ((inside ? 0 : 1) - this.overlayAlpha) * k;
      this.darkness += ((inside ? 1 : 0) - this.darkness) * k;

      for (const bat of this.bats) updateBat(bat, dt, player, this, world);

      // Respawn one bat at a time until the cave is full again
      if (this.bats.length < BAT_SETTINGS.maxBats) {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
          this.spawnBat(player);
          this.respawnTimer = BAT_SETTINGS.respawnSeconds;
        }
      }
    },

    // ---- Drawing ----

    paintGround(g) {
      for (let ty = y0; ty < y0 + h; ty++)
        for (let tx = x0; tx < x0 + w; tx++) {
          const t = world.getTile(tx, ty);
          if (t === T.CAVE_FLOOR) paintCaveFloor(g, tx, ty);
          else if (t === T.CAVE_WALL) paintCaveWall(g, tx, ty);
        }
      // Open the plaza curb where the cave path joins it
      for (let tx = mouthX0; tx < mouthX0 + MOUTH_W; tx++) paintCobbles(g, tx, town.y);
    },

    /** The rock hill over the cave (fades out while you're inside). */
    drawOverlay(ctx) {
      if (this.overlayAlpha < 0.01) return;
      ctx.globalAlpha = this.overlayAlpha;
      ctx.drawImage(this.overlay, x0 * TILE - HILL_PAD_X, y0 * TILE - HILL_PAD_TOP);
      ctx.globalAlpha = 1;
    },

    /** Darkness with a pool of light around the player. Screen-space: (sx, sy) in canvas px. */
    drawDarkness(ctx, sx, sy, scale, width, height) {
      if (this.darkness < 0.01) return;
      const g = ctx.createRadialGradient(sx, sy, 40 * scale, sx, sy, 190 * scale);
      g.addColorStop(0, 'rgba(8, 6, 12, 0)');
      g.addColorStop(1, `rgba(8, 6, 12, ${0.9 * this.darkness})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    },

    /** Bat eyes glow through the darkness. World-space. */
    drawGlowingEyes(ctx) {
      if (this.darkness < 0.1) return;
      ctx.globalAlpha = this.darkness;
      for (const bat of this.bats) drawBatEyes(ctx, bat);
      ctx.globalAlpha = 1;
    },
  };

  for (let i = 0; i < BAT_SETTINGS.maxBats; i++) cave.spawnBat(null);
  return cave;
}

// ---- Ground ----

function hash(tx, ty, i) {
  let h = (tx * 374761393) ^ (ty * 668265263) ^ (i * 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function paintCaveFloor(g, tx, ty) {
  const px = tx * TILE, py = ty * TILE;
  g.fillStyle = '#2f2a26';
  g.fillRect(px, py, TILE, TILE);
  g.fillStyle = '#3b3530';
  for (let i = 0; i < 5; i++) g.fillRect(px + hash(tx, ty, i) * 28, py + hash(ty, tx, i) * 28, 3, 2);
  g.fillStyle = '#25211e';
  for (let i = 5; i < 8; i++) g.fillRect(px + hash(tx, ty, i) * 28, py + hash(ty, tx, i) * 28, 2, 2);
}

function paintCaveWall(g, tx, ty) {
  const px = tx * TILE, py = ty * TILE;
  g.fillStyle = '#5f5951';
  g.fillRect(px, py, TILE, TILE);
  g.fillStyle = '#716b62';
  g.fillRect(px + 2, py + 2, TILE - 4, 10);
  g.fillStyle = '#4c4741';
  g.fillRect(px + hash(tx, ty, 1) * 20, py + 14, 10, 1);
  g.fillRect(px + hash(tx, ty, 2) * 20, py + 22, 8, 1);
}

// ---- The hill over the cave ----

const HILL_PAD_X = 24;
const HILL_PAD_TOP = 26;

function renderHill(w, h, mouthOffset, rng) {
  const cw = w * TILE + HILL_PAD_X * 2;
  const ch = h * TILE + HILL_PAD_TOP + 6;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');

  const cx = cw / 2, cy = HILL_PAD_TOP + (h * TILE) / 2;
  const rx = (w * TILE) / 2 + 18, ry = (h * TILE) / 2 + 10;

  // Lumpy outline: an oval with smoothed random bumps
  const N = 56;
  const bumps = Array.from({ length: N }, () => 1 + (rng() - 0.5) * 0.08);
  const r = (i) => (bumps[(i + N - 1) % N] + bumps[i] * 2 + bumps[(i + 1) % N]) / 4;
  const outline = (scale, dy = 0) => {
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const k = r(i % N) * scale;
      const px = cx + Math.cos(a) * rx * k;
      const py = cy + dy + Math.min(Math.sin(a) * ry * k, ch - 4 - cy - dy); // flat-ish bottom
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
  };

  // Shadow, rock body, sunlit top
  g.fillStyle = 'rgba(0,0,0,0.25)';
  outline(1.0, 4);
  g.fill();
  g.fillStyle = '#5f5951';
  outline(1.0);
  g.fill();
  g.save();
  outline(1.0);
  g.clip();
  const grad = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  grad.addColorStop(0, '#9a938a');
  grad.addColorStop(0.55, '#7a746c');
  grad.addColorStop(1, '#5a554e');
  g.fillStyle = grad;
  outline(0.96, -3);
  g.fill();

  // Boulders and ledges in the rock face
  for (let i = 0; i < 26; i++) {
    const bx = cx + (rng() - 0.5) * rx * 1.7, by = cy + (rng() - 0.3) * ry * 1.4;
    const bw = 14 + rng() * 26, bh = 8 + rng() * 14;
    g.fillStyle = 'rgba(40, 36, 32, 0.35)';
    g.beginPath();
    g.ellipse(bx, by + 3, bw, bh, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = rng() < 0.5 ? '#8c857b' : '#837c72';
    g.beginPath();
    g.ellipse(bx, by, bw, bh, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.ellipse(bx - bw * 0.2, by - bh * 0.35, bw * 0.55, bh * 0.35, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Grass and shrubs growing on top of the hill
  for (let i = 0; i < 34; i++) {
    const a = Math.PI + rng() * Math.PI; // upper half
    const k = 0.35 + rng() * 0.55;
    const gx = cx + Math.cos(a) * rx * k, gy = cy + Math.sin(a) * ry * k - 4;
    g.fillStyle = ['#4a8c3c', '#5aa04a', '#3f7d35'][Math.floor(rng() * 3)];
    g.beginPath();
    g.ellipse(gx, gy, 8 + rng() * 14, 5 + rng() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // Dark rim around the hill
  g.strokeStyle = '#3f3a35';
  g.lineWidth = 3;
  outline(1.0);
  g.stroke();

  // The cave mouth: a dark arch at the bottom middle
  const mx = HILL_PAD_X + (mouthOffset + MOUTH_W / 2) * TILE;
  const mw = MOUTH_W * TILE - 14, mh = 52;
  const mb = ch - 6;
  const arch = () => {
    g.beginPath();
    g.moveTo(mx - mw / 2, mb);
    g.lineTo(mx - mw / 2, mb - mh * 0.45);
    g.quadraticCurveTo(mx - mw / 2, mb - mh, mx, mb - mh);
    g.quadraticCurveTo(mx + mw / 2, mb - mh, mx + mw / 2, mb - mh * 0.45);
    g.lineTo(mx + mw / 2, mb);
    g.closePath();
  };
  g.lineWidth = 8;
  g.strokeStyle = '#4f4a44';
  arch();
  g.stroke();
  const mg = g.createLinearGradient(0, mb - mh, 0, mb);
  mg.addColorStop(0, '#0b0908');
  mg.addColorStop(1, '#1d1916');
  g.fillStyle = mg;
  arch();
  g.fill();
  // Little stalactite teeth at the top of the mouth
  g.fillStyle = '#5f5951';
  for (let i = -2; i <= 2; i++) {
    const tx = mx + i * (mw / 6);
    const top = mb - mh + Math.abs(i) * 6 + 2;
    g.beginPath();
    g.moveTo(tx - 4, top);
    g.lineTo(tx + 4, top);
    g.lineTo(tx, top + 8 + (i % 2 ? 3 : 0));
    g.closePath();
    g.fill();
  }
  return c;
}
