// Choppable trees: shake when hit, topple when felled, leave a stump and drop wood.
import { TILE } from './constants.js';
import { drawTree, drawStump } from './sprites.js';
import { spawnDrop } from './pickups.js';

export const TREE_HP = 3; // axe hits to fell a tree
const SHAKE_TIME = 0.25;
const FALL_TIME = 0.7;
const REACH = 40; // px from the player's feet to the trunk
const WOOD_PER_TREE = 3;

export function createTree(tx, ty, s) {
  return {
    kind: 'tree',
    tx, ty, s,
    x: (tx + 0.5) * TILE,
    y: (ty + 1) * TILE - 4,
    hp: TREE_HP,
    shake: 0,
    fall: null, // { t, dir } once felled
    draw(ctx) { drawChoppableTree(ctx, this); },
    update(dt, world) { return updateTree(this, dt, world); },
  };
}

function drawChoppableTree(ctx, t) {
  if (t.fall) {
    const p = Math.min(1, t.fall.t / FALL_TIME);
    ctx.save();
    ctx.globalAlpha = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
    ctx.translate(t.x, t.y);
    ctx.rotate(t.fall.dir * p * p * (Math.PI / 2)); // accelerate as it topples
    ctx.translate(-t.x, -t.y);
    drawTree(ctx, t);
    ctx.restore();
    return;
  }
  if (t.shake > 0) {
    const off = Math.sin(t.shake * 70) * 2 * (t.shake / SHAKE_TIME);
    drawTree(ctx, { x: t.x + off, y: t.y, s: t.s });
    return;
  }
  drawTree(ctx, t);
}

/** Returns false once the tree has nothing left to animate. */
function updateTree(t, dt, world) {
  if (t.shake > 0) t.shake = Math.max(0, t.shake - dt);
  if (!t.fall) return t.shake > 0;

  t.fall.t += dt;
  if (t.fall.t < FALL_TIME) return true;

  // Hit the ground: puff of leaves, then the logs pop out
  world.removeObject(t);
  const landX = t.x + t.fall.dir * 30 * t.s;
  for (let i = 0; i < 10; i++) {
    world.addParticle({
      x: landX + (Math.random() - 0.5) * 30, y: t.y - 6 - Math.random() * 8,
      vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 50, gravity: 160,
      life: 0.7, size: 3, color: ['#2b6331', '#3a823b', '#4b9a45'][i % 3],
    });
  }
  for (let i = 0; i < WOOD_PER_TREE; i++) {
    spawnDrop(world, 'wood', t.x + (Math.random() - 0.5) * 16, t.y - 4 + Math.random() * 6);
  }
  return false;
}

/** The nearest standing tree within reach in the direction the player faces. */
export function findTreeInFront(world, player) {
  const [fx, fy] = player.facingVec;
  let best = null, bestD = Infinity;
  for (const o of world.objects) {
    if (o.kind !== 'tree' || o.fall) continue;
    const dx = o.x - player.x;
    const dy = (o.ty + 0.5) * TILE - (player.y - 3);
    const d = Math.hypot(dx, dy);
    if (d > REACH || d >= bestD) continue;
    if (dx * fx + dy * fy < d * 0.5) continue; // not in front of us
    best = o;
    bestD = d;
  }
  return best;
}

/** One axe hit. Returns true if this hit felled the tree. */
export function chopTree(world, tree, player) {
  tree.hp--;
  tree.shake = SHAKE_TIME;
  world.active.add(tree);

  // wood chips from the trunk + a couple of leaves shaken loose
  const side = player.x < tree.x ? -1 : 1;
  for (let i = 0; i < 6; i++) {
    world.addParticle({
      x: tree.x + side * 4, y: tree.y - 8 - Math.random() * 6,
      vx: side * (30 + Math.random() * 60), vy: -50 - Math.random() * 60, gravity: 320,
      life: 0.45, size: 2, color: i % 2 ? '#d9b07a' : '#a77b4a',
    });
  }
  for (let i = 0; i < 3; i++) {
    world.addParticle({
      x: tree.x + (Math.random() - 0.5) * 24 * tree.s, y: tree.y - 36 * tree.s,
      vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 20, gravity: 30,
      life: 0.9, size: 2.5, color: '#4b9a45',
    });
  }

  if (tree.hp > 0) return false;

  // Timber! Fall away from the player.
  tree.fall = { t: 0, dir: tree.x >= player.x ? 1 : -1 };
  markFelled(world, tree);
  return true;
}

/** Free the tile, leave a stump, and remember it (so saved games keep the stump). */
function markFelled(world, tree) {
  world.felled.add(`${tree.tx},${tree.ty}`);
  world.unblock(tree.tx, tree.ty);
  world.addObject({
    x: tree.x, y: tree.y - 1, // sorts just behind the falling trunk
    draw(ctx) { drawStump(ctx, this.x, this.y + 1, tree.s); },
  });
}

/** Restore a tree that was felled in a saved game: straight to a stump, no animation or drops. */
export function restoreFelledTree(world, tx, ty) {
  const tree = world.objects.find((o) => o.kind === 'tree' && o.tx === tx && o.ty === ty);
  if (!tree) return;
  world.removeObject(tree);
  markFelled(world, tree);
}
