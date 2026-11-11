// The player's home base: a small house built into the world's tile map.
import { TILE, T } from '../core/constants.js';
import { furnitureDrawers } from './furniture.js';
import { rrect } from '../core/utils.js';
import { RadioPlayer } from '../audio/radio.js';
import { Inventory } from '../items/inventory.js';
import { makeItem } from '../items/items.js';

const ROOF_OVERHANG = 8;
const ROOF_LIFT = 26;

export function buildHouse(world, x, y, w, h) {
  // Walls around the edge, wooden floor inside.
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      const edge = tx === x || tx === x + w - 1 || ty === y || ty === y + h - 1;
      world.setTile(tx, ty, edge ? T.WALL : T.FLOOR);
    }
  }

  const door = { x: x + Math.floor(w / 2), y: y + h - 1 };
  world.setTile(door.x, door.y, T.DOOR);

  const interior = { x: x + 1, y: y + 1, w: w - 2, h: h - 2 };
  const radio = new RadioPlayer();
  const chest = new Inventory(5, [makeItem('apple'), makeItem('lantern'), makeItem('fishingRod'), makeItem('axe')]);
  const chestState = { open: false };
  const ix = interior.x, iy = interior.y;

  const furniture = [
    { kind: 'bed', tx: ix, ty: iy, tw: 1, th: 2 },
    { kind: 'bookshelf', tx: ix + 2, ty: iy, tw: 2, th: 1 },
    {
      kind: 'chest', tx: ix + interior.w - 1, ty: iy, tw: 1, th: 1,
      state: chestState,
      hitbox: { x: 2, y: 0, w: TILE - 4, h: TILE },
      onClick: () => house.onChestClick?.(),
    },
    {
      kind: 'radio', tx: ix + interior.w - 2, ty: iy, tw: 1, th: 1,
      state: radio,
      // Clickable area in px, relative to the tile's top-left (the radio pokes up above its tile).
      hitbox: { x: 3, y: -22, w: TILE - 6, h: TILE + 20 },
      onClick: () => radio.toggle(),
    },
    { kind: 'table', tx: ix + interior.w - 2, ty: iy + 2, tw: 1, th: 1 },
    { kind: 'plant', tx: ix, ty: iy + interior.h - 1, tw: 1, th: 1 },
  ];

  const house = {
    x, y, w, h, door, interior, radio, chest, chestState,
    onChestClick: null, // set by the game: opens the chest UI
    roofAlpha: 1,
    roof: renderRoof(w, h),
    // Start the player just inside the front door.
    spawn: { x: (door.x + 0.5) * TILE, y: door.y * TILE - 4 },

    /** Is a point (feet position, px) inside the house or standing in the doorway? */
    contains(px, py) {
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      if (tx === door.x && ty === door.y) return true;
      return tx >= interior.x && tx < interior.x + interior.w &&
             ty >= interior.y && ty < interior.y + interior.h;
    },

    update(dt, playerInside) {
      const target = playerInside ? 0 : 1;
      this.roofAlpha += (target - this.roofAlpha) * Math.min(1, dt * 8);
      // The radio can only be heard inside: it fades in/out with the roof.
      radio.update(dt, 1 - this.roofAlpha);
    },

    /** Interior objects can only be clicked when the roof is out of the way. */
    interiorVisible() {
      return this.roofAlpha < 0.5;
    },

    /** Paint walls / floor / decor onto the pre-rendered ground layer. */
    paintGround(ctx) {
      for (let ty = y; ty < y + h; ty++) {
        for (let tx = x; tx < x + w; tx++) {
          const px = tx * TILE, py = ty * TILE;
          const tile = world.getTile(tx, ty);
          if (tile === T.FLOOR) paintFloor(ctx, px, py, tx, ty);
          else if (tile === T.DOOR) paintDoor(ctx, px, py, tx, ty);
          else if (ty === y + h - 1) paintFacade(ctx, px, py, tx === x + 2 || tx === x + w - 3);
          else if (ty === y && tx > x && tx < x + w - 1) paintBackWall(ctx, px, py);
          else paintWallTop(ctx, px, py);
        }
      }
      // Rug in the middle of the room
      const rx = (ix + 2) * TILE + 4, ry = (iy + 2) * TILE + 4;
      ctx.fillStyle = '#d9a441';
      rrect(ctx, rx, ry, 3 * TILE - 8, 2 * TILE - 8, 4);
      ctx.fillStyle = '#7b2d3a';
      rrect(ctx, rx + 3, ry + 3, 3 * TILE - 14, 2 * TILE - 14, 3);
      ctx.fillStyle = '#9b3d4a';
      rrect(ctx, rx + 12, ry + 12, 3 * TILE - 32, 2 * TILE - 32, 3);
      // Doormat outside the door
      ctx.fillStyle = '#8e5b3a';
      rrect(ctx, door.x * TILE + 5, (door.y + 1) * TILE + 2, TILE - 10, 10, 2);
    },

    drawRoof(ctx) {
      if (this.roofAlpha < 0.01) return;
      ctx.globalAlpha = this.roofAlpha;
      ctx.drawImage(this.roof, x * TILE - ROOF_OVERHANG, y * TILE - ROOF_LIFT);
      ctx.globalAlpha = 1;
    },
  };

  for (const f of furniture) {
    for (let ty = f.ty; ty < f.ty + f.th; ty++)
      for (let tx = f.tx; tx < f.tx + f.tw; tx++) world.block(tx, ty);
    const px = f.tx * TILE, py = f.ty * TILE, pw = f.tw * TILE, ph = f.th * TILE;
    const obj = {
      x: px + pw / 2,
      y: py + ph, // depth-sort by bottom edge
      draw: (ctx) => furnitureDrawers[f.kind](ctx, px, py, pw, ph, f.state),
    };
    if (f.onClick) {
      obj.hitbox = { x: px + f.hitbox.x, y: py + f.hitbox.y, w: f.hitbox.w, h: f.hitbox.h };
      obj.canInteract = () => house.interiorVisible();
      obj.onClick = f.onClick;
    }
    world.addObject(obj);
  }

  return house;
}

// ---- Painting helpers ----

function paintFloor(ctx, px, py, tx, ty) {
  ctx.fillStyle = '#a8743f';
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#8e5f30';
  for (let i = 0; i < 4; i++) {
    const ly = py + i * 8;
    ctx.fillRect(px, ly + 7, TILE, 1);
    const seam = (tx * 13 + ty * 7 + i * 11) % TILE;
    ctx.fillRect(px + seam, ly, 1, 7);
  }
}

function paintDoor(ctx, px, py, tx, ty) {
  paintFloor(ctx, px, py, tx, ty);
  ctx.fillStyle = '#4a2f1d';
  ctx.fillRect(px, py, 5, TILE);
  ctx.fillRect(px + TILE - 5, py, 5, TILE);
  ctx.fillStyle = '#7d7d7d';
  ctx.fillRect(px + 5, py + TILE - 4, TILE - 10, 4); // threshold
}

function paintFacade(ctx, px, py, hasWindow) {
  ctx.fillStyle = '#a0663a';
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#86522c';
  for (let i = 1; i < 4; i++) ctx.fillRect(px, py + i * 6, TILE, 1);
  ctx.fillStyle = '#7d7d7d'; // stone foundation
  ctx.fillRect(px, py + TILE - 7, TILE, 7);
  ctx.fillStyle = '#666';
  ctx.fillRect(px + 10, py + TILE - 7, 1, 7);
  ctx.fillRect(px + 24, py + TILE - 7, 1, 7);
  if (hasWindow) {
    ctx.fillStyle = '#f0e6d2';
    ctx.fillRect(px + 7, py + 5, 18, 15);
    ctx.fillStyle = '#9fd3f0';
    ctx.fillRect(px + 9, py + 7, 14, 11);
    ctx.fillStyle = '#f0e6d2';
    ctx.fillRect(px + 15, py + 7, 2, 11);
    ctx.fillRect(px + 9, py + 12, 14, 1);
  }
}

function paintBackWall(ctx, px, py) {
  ctx.fillStyle = '#d8b88f'; // plaster
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#8b5a3c'; // wainscot
  ctx.fillRect(px, py + 20, TILE, 12);
  ctx.fillStyle = '#6e4229';
  ctx.fillRect(px, py + 20, TILE, 2);
  ctx.fillStyle = '#4a2f1d';
  ctx.fillRect(px, py, TILE, 4);
}

function paintWallTop(ctx, px, py) {
  ctx.fillStyle = '#5b3a24';
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#6e4a30';
  ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
}

function renderRoof(w, h) {
  const cw = w * TILE + ROOF_OVERHANG * 2;
  // Covers every row except the front facade, plus a small lip over the facade top.
  const ch = (h - 1) * TILE + ROOF_LIFT + 6;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');
  const ridge = Math.round(ch * 0.42);

  // back slope (in shade) and front slope (in sun)
  g.fillStyle = '#8a3324';
  g.fillRect(0, 0, cw, ridge);
  g.fillStyle = '#b5452f';
  g.fillRect(0, ridge, cw, ch - ridge);

  // shingle rows
  for (let yy = 0; yy < ch; yy += 9) {
    g.fillStyle = yy >= ridge ? '#953826' : '#702819';
    g.fillRect(0, yy, cw, 1);
    const offset = (yy / 9) % 2 ? 6 : 0;
    for (let xx = offset; xx < cw; xx += 12) g.fillRect(xx, yy, 1, 9);
  }

  // ridge cap + eaves
  g.fillStyle = '#5e1f14';
  g.fillRect(0, ridge - 3, cw, 6);
  g.fillStyle = '#4a1810';
  g.fillRect(0, ch - 5, cw, 5);
  g.fillRect(0, 0, cw, 3);

  // chimney
  const chx = Math.round(cw * 0.72);
  g.fillStyle = '#8a8a8a';
  g.fillRect(chx, ridge - 34, 18, 30);
  g.fillStyle = '#6a6a6a';
  g.fillRect(chx, ridge - 34, 18, 5);
  g.fillRect(chx + 6, ridge - 25, 1, 21);
  g.fillStyle = '#3a3a3a';
  g.fillRect(chx + 3, ridge - 33, 12, 3);

  return c;
}
