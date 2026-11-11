// Items lying on the ground. They pop out with a little bounce and get picked up
// automatically when the player walks over them (if there's room in the bag).
import { ITEMS, iconImage } from '../items/items.js';
import { ellipse } from '../core/utils.js';

const PICKUP_RADIUS = 20;
const PICKUP_DELAY = 0.4; // let it land before it can be grabbed

/** pop: true = bounce out (fresh loot); false = already resting on the ground (restored save). */
export function spawnDrop(world, type, x, y, count = 1, pop = true) {
  const drop = {
    kind: 'pickup',
    item: { type, count },
    x, y,
    z: 0, // height above ground
    vz: pop ? 110 + Math.random() * 50 : 0,
    vx: pop ? (Math.random() - 0.5) * 70 : 0,
    age: pop ? 0 : 1,
    warned: false,
    draw(ctx) { drawDrop(ctx, this); },
    update(dt, world) {
      this.age += dt;
      if (this.z > 0 || this.vz > 0) {
        const nx = this.x + this.vx * dt;
        if (!world.collides(nx - 3, this.y - 3, 6, 3)) this.x = nx;
        this.vz -= 500 * dt;
        this.z += this.vz * dt;
        if (this.z <= 0) {
          this.z = 0;
          this.vz = this.vz < -80 ? -this.vz * 0.35 : 0; // small bounce
          this.vx *= 0.5;
        }
      }
      return true; // keep bobbing while it's on the ground
    },
  };
  world.addObject(drop);
  world.active.add(drop);
  return drop;
}

function drawDrop(ctx, d) {
  const bob = d.z > 0 ? d.z : 2 + Math.sin(d.age * 3) * 1.5;
  ctx.fillStyle = `rgba(0,0,0,${0.25 - Math.min(0.15, bob / 100)})`;
  ellipse(ctx, d.x, d.y, 6, 2.5);
  const img = iconImage(d.item.type);
  if (img.complete) ctx.drawImage(img, d.x - 8, d.y - 16 - bob, 16, 16);
}

/** Pick up anything the player is standing on. */
export function collectPickups(world, player) {
  const bag = player.inventory;
  const grabbed = [];
  for (const o of world.objects) {
    if (o.kind !== 'pickup' || o.age < PICKUP_DELAY) continue;
    const d = Math.hypot(o.x - player.x, o.y - player.y);
    if (d > PICKUP_RADIUS) {
      if (d > PICKUP_RADIUS * 2) o.warned = false;
      continue;
    }
    const before = o.item.count;
    const left = bag.add(o.item);
    if (left < before) {
      world.addParticle({
        x: o.x, y: o.y - 18, vx: 0, vy: -30, gravity: 0, life: 0.9,
        text: `+${before - left} ${ITEMS[o.item.type].name}`,
      });
    }
    if (left === 0) grabbed.push(o);
    else {
      o.item.count = left;
      if (!o.warned) {
        world.notify?.('Your bag is full', 'error');
        o.warned = true;
      }
    }
  }
  for (const o of grabbed) world.removeObject(o);
}
