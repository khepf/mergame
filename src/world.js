import { TILE, T, SOLID_TILES, SWIMMABLE_TILES } from './constants.js';
import { mulberry32, clamp } from './utils.js';
import { buildHouse } from './house.js';
import { drawTree, drawRock } from './sprites.js';
import { buildTown, TOWN_W, TOWN_H } from './town.js';

const MEADOW_WIDTH = 64; // tiles: the home area on the west side of the map

export class World {
  constructor(width, height, seed = 1) {
    this.width = width;
    this.height = height;
    this.pxWidth = width * TILE;
    this.pxHeight = height * TILE;
    this.tiles = new Uint8Array(width * height);
    this.blocked = new Uint8Array(width * height); // solid objects (trunks, furniture)
    this.objects = []; // depth-sorted drawables: { x, y, draw(ctx) }
    this.rng = mulberry32(seed);

    this.generate();
    this.ground = this.renderGround(seed);
  }

  // ---- Tile access ----

  inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }
  getTile(tx, ty) {
    return this.inBounds(tx, ty) ? this.tiles[ty * this.width + tx] : -1;
  }
  setTile(tx, ty, t) {
    if (this.inBounds(tx, ty)) this.tiles[ty * this.width + tx] = t;
  }
  block(tx, ty) {
    if (this.inBounds(tx, ty)) this.blocked[ty * this.width + tx] = 1;
  }
  /** extraSolid: optional set of tile types to also treat as solid (e.g. while on a bike). */
  isSolid(tx, ty, extraSolid = null) {
    if (!this.inBounds(tx, ty)) return true;
    const i = ty * this.width + tx;
    const t = this.tiles[i];
    return SOLID_TILES.has(t) || this.blocked[i] === 1 || (extraSolid !== null && extraSolid.has(t));
  }

  /** Is the pixel-space point in swimmable water? */
  isWater(px, py) {
    return SWIMMABLE_TILES.has(this.getTile(Math.floor(px / TILE), Math.floor(py / TILE)));
  }

  /** Does a pixel-space rectangle overlap anything solid? */
  collides(x, y, w, h, extraSolid = null) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.001) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) if (this.isSolid(tx, ty, extraSolid)) return true;
    return false;
  }

  addObject(o) {
    this.objects.push(o);
  }

  // ---- Generation ----

  generate() {
    const { width: W, height: H } = this;
    this.tiles.fill(T.GRASS);

    // Home meadow occupies the western part of the map.
    const hw = 9, hh = 7;
    const hx = Math.floor(MEADOW_WIDTH / 2 - hw / 2), hy = Math.floor(H / 2 - hh / 2);

    this.carvePond(hx + hw + 9, hy - 3, 5.5, 3.8);
    this.house = buildHouse(this, hx, hy, hw, hh);

    // Market Square sits at the east end, through the woods.
    this.town = buildTown(this, W - TOWN_W - 6, Math.floor(H / 2 - TOWN_H / 2) + 2);

    this.carvePath(this.house.door.x, this.house.door.y + 1, this.town.entrance);
    this.plantTrees();
  }

  /** Name of the area at a pixel position (shown in the HUD). */
  regionAt(px, py) {
    if (this.town.contains(px, py)) return 'Market Square';
    if (px > (MEADOW_WIDTH + 4) * TILE) return 'Woods';
    return 'Meadow';
  }

  carvePond(cx, cy, rx, ry) {
    const rng = this.rng;
    for (let ty = Math.floor(cy - ry - 1); ty <= cy + ry + 1; ty++) {
      for (let tx = Math.floor(cx - rx - 1); tx <= cx + rx + 1; tx++) {
        const dx = (tx + 0.5 - cx) / rx, dy = (ty + 0.5 - cy) / ry;
        if (dx * dx + dy * dy < 1 + (rng() - 0.5) * 0.3) this.setTile(tx, ty, T.WATER);
      }
    }
    // Sandy shore around the water
    const shore = [];
    for (let ty = 0; ty < this.height; ty++)
      for (let tx = 0; tx < this.width; tx++) {
        if (this.getTile(tx, ty) !== T.GRASS) continue;
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++)
            if (this.getTile(tx + ox, ty + oy) === T.WATER) shore.push([tx, ty]);
      }
    for (const [tx, ty] of shore) this.setTile(tx, ty, T.SAND);
  }

  /** Winding path from the front door east to the target tile (the town entrance). */
  carvePath(sx, sy, target) {
    const rng = this.rng;
    const setPath = (tx, ty) => {
      const t = this.getTile(tx, ty);
      if (t === T.GRASS || t === T.SAND) this.setTile(tx, ty, T.PATH);
    };
    let x = sx, y = sy;
    for (let i = 0; i < 4; i++) setPath(x, y++);
    const minY = this.house.y + this.house.h + 1;
    while (x < target.x) {
      setPath(x, y);
      const remaining = target.x - x;
      let ny = y;
      if (remaining <= Math.abs(target.y - y) + 6) {
        // Running out of room: steer toward the entrance
        if (y !== target.y) ny = y + Math.sign(target.y - y);
      } else if (rng() < 0.22) {
        ny = y + (rng() < 0.5 ? -1 : 1);
      }
      // Stay below the house while passing it; free to climb toward town after that
      const top = x < this.house.x + this.house.w + 4 ? minY : minY - 6;
      if (ny !== y && ny > top && ny < this.height - 3) {
        y = ny;
        setPath(x, y);
      }
      x++;
    }
  }

  plantTrees() {
    const rng = this.rng, h = this.house, town = this.town;
    const hcx = h.x + h.w / 2, hcy = h.y + h.h / 2;
    const tcx = town.x + town.w / 2, tcy = town.y + town.h / 2;
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        if (this.getTile(tx, ty) !== T.GRASS) continue;
        // Keep clearings around the house and the town
        if (tx >= h.x - 3 && tx <= h.x + h.w + 2 && ty >= h.y - 3 && ty <= h.y + h.h + 3) continue;
        if (tx >= town.x - 3 && tx <= town.x + town.w + 2 && ty >= town.y - 3 && ty <= town.y + town.h + 2) continue;
        if (this.nearTile(tx, ty, T.PATH)) continue;

        const edge = Math.min(tx, ty, this.width - 1 - tx, this.height - 1 - ty);
        // Woods get thicker the further you are from home or town
        const dist = Math.min(Math.hypot(tx - hcx, ty - hcy), Math.hypot(tx - tcx, ty - tcy) - 8);
        let p = edge < 2 ? 0.85 : 0.06 + clamp((dist - 9) / 40, 0, 0.16);

        if (rng() < p) {
          this.block(tx, ty);
          this.addObject({
            x: (tx + 0.5) * TILE, y: (ty + 1) * TILE - 4, s: 0.85 + rng() * 0.35,
            draw(ctx) { drawTree(ctx, this); },
          });
        } else if (rng() < 0.012) {
          this.block(tx, ty);
          this.addObject({
            x: (tx + 0.5) * TILE, y: (ty + 1) * TILE - 6,
            draw(ctx) { drawRock(ctx, this); },
          });
        }
      }
    }
  }

  nearTile(tx, ty, type) {
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) if (this.getTile(tx + ox, ty + oy) === type) return true;
    return false;
  }

  // ---- Rendering ----

  /** Pre-render all static ground tiles to one big canvas (cheap to blit each frame). */
  renderGround(seed) {
    const c = document.createElement('canvas');
    c.width = this.pxWidth;
    c.height = this.pxHeight;
    const g = c.getContext('2d');
    const rng = mulberry32(seed * 7919 + 1);
    const flowers = ['#f4f1ea', '#f7d046', '#e88bb5', '#b48ce8'];

    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        const px = tx * TILE, py = ty * TILE;
        switch (this.getTile(tx, ty)) {
          case T.GRASS: {
            g.fillStyle = ['#5aa04a', '#57a047', '#5ca44c'][Math.floor(rng() * 3)];
            g.fillRect(px, py, TILE, TILE);
            g.fillStyle = '#4a8c3c';
            for (let i = 0; i < 4; i++) g.fillRect(px + rng() * 30, py + rng() * 28, 1, 3);
            if (rng() < 0.05) {
              g.fillStyle = flowers[Math.floor(rng() * flowers.length)];
              const fx = px + 6 + rng() * 20, fy = py + 6 + rng() * 20;
              g.fillRect(fx, fy, 3, 3);
              g.fillRect(fx + 5, fy + 3, 3, 3);
            }
            break;
          }
          case T.PATH: {
            g.fillStyle = '#c9a66b';
            g.fillRect(px, py, TILE, TILE);
            g.fillStyle = '#b08f58';
            for (let i = 0; i < 3; i++) g.fillRect(px + rng() * 28, py + rng() * 28, 3, 2);
            break;
          }
          case T.SAND: {
            g.fillStyle = '#dcc68a';
            g.fillRect(px, py, TILE, TILE);
            g.fillStyle = '#cbb477';
            for (let i = 0; i < 3; i++) g.fillRect(px + rng() * 30, py + rng() * 30, 2, 2);
            break;
          }
          case T.WATER: {
            g.fillStyle = '#3d7fc4';
            g.fillRect(px, py, TILE, TILE);
            g.fillStyle = '#5c9bd8';
            if (rng() < 0.5) g.fillRect(px + rng() * 20, py + rng() * 28, 8, 1);
            break;
          }
        }
      }
    }
    this.house.paintGround(g);
    this.town.paintGround(g);
    return c;
  }

  drawGround(ctx, cam) {
    const sx = Math.max(0, Math.floor(cam.x)), sy = Math.max(0, Math.floor(cam.y));
    const sw = Math.min(this.pxWidth - sx, Math.ceil(cam.w) + 2);
    const sh = Math.min(this.pxHeight - sy, Math.ceil(cam.h) + 2);
    if (sw > 0 && sh > 0) ctx.drawImage(this.ground, sx, sy, sw, sh, sx, sy, sw, sh);
  }

  visibleObjects(cam) {
    return this.objects.filter(
      (o) => o.x > cam.x - 64 && o.x < cam.x + cam.w + 64 && o.y > cam.y - 16 && o.y < cam.y + cam.h + 96
    );
  }
}
