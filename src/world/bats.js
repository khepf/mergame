// Cave bats: flutter around the cave, swarm the player when close, take a few sword hits,
// drop a bat wing when killed, and respawn over time.
import { ellipse } from '../core/utils.js';
import { spawnDrop } from './pickups.js';

// ---- Tweak these to change how the cave plays ----
export const BAT_SETTINGS = {
  maxBats: 5, // how many bats the cave holds at once
  respawnSeconds: 30, // one new bat flies in this often, until the cave is full again
  hitsToKill: 3, // sword hits per bat
  biteDamage: 5, // health lost per bat bite
  biteCooldown: 1.8, // seconds (roughly) between one bat's bites
};

const WANDER_SPEED = 45; // px/s
const SWARM_SPEED = 85;
const SWARM_RADIUS = 150; // px: bats notice the player within this range
const REACH = 46; // px: sword reach from the player's feet
const FLASH_TIME = 0.15;
const LUNGE_SPEED = 140; // px/s when diving in to bite
const BITE_RANGE = 14; // px

export function createBat(x, y) {
  return {
    kind: 'bat',
    x, y, // ground point under the bat (for sorting / shadow)
    z: 20 + Math.random() * 8, // flying height
    vx: 0, vy: 0,
    hp: BAT_SETTINGS.hitsToKill,
    flap: Math.random() * 10,
    orbit: Math.random() * Math.PI * 2, // angle around the player while swarming
    target: null,
    flash: 0,
    biteTimer: 1 + Math.random() * BAT_SETTINGS.biteCooldown, // first bite comes after a moment
    draw(ctx) { drawBat(ctx, this); },
  };
}

/** Move one bat. cave.isFloorAt(px, py) keeps it inside the cave. */
export function updateBat(bat, dt, player, cave, world) {
  bat.flap += dt * 16;
  bat.flash = Math.max(0, bat.flash - dt);
  bat.biteTimer -= dt;
  const t = performance.now() / 1000;

  // Pick where to go
  const dPlayer = Math.hypot(player.x - bat.x, player.y - bat.y);
  let speed = WANDER_SPEED;
  if (cave.contains(player.x, player.y) && dPlayer < SWARM_RADIUS && !player.fainted) {
    if (bat.biteTimer <= 0 && bat.flash <= 0) {
      // Dive in for a bite
      bat.target = { x: player.x, y: player.y - 4 };
      speed = LUNGE_SPEED;
      if (dPlayer < BITE_RANGE) {
        player.takeDamage(BAT_SETTINGS.biteDamage, bat.x, bat.y, world);
        bat.biteTimer = BAT_SETTINGS.biteCooldown * (0.7 + Math.random() * 0.6);
        bat.orbit += Math.PI; // peel off to the other side
      }
    } else {
      // Swarm: circle the player, darting in and out
      bat.orbit += dt * 2.2;
      const r = 26 + Math.sin(t * 3 + bat.orbit) * 14;
      bat.target = { x: player.x + Math.cos(bat.orbit) * r, y: player.y - 4 + Math.sin(bat.orbit) * r * 0.6 };
      speed = SWARM_SPEED;
    }
  } else if (!bat.target || Math.hypot(bat.target.x - bat.x, bat.target.y - bat.y) < 10) {
    bat.target = cave.randomFloorPoint();
  }

  // Steer smoothly toward the target, with a little jitter
  const dx = bat.target.x - bat.x, dy = bat.target.y - bat.y;
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, dt * 3);
  bat.vx += ((dx / d) * speed + (Math.random() - 0.5) * 60 - bat.vx) * k;
  bat.vy += ((dy / d) * speed + (Math.random() - 0.5) * 60 - bat.vy) * k;

  const nx = bat.x + bat.vx * dt, ny = bat.y + bat.vy * dt;
  if (cave.isFloorAt(nx, ny)) {
    bat.x = nx;
    bat.y = ny;
  } else {
    // Bounce off the cave wall and pick somewhere else
    bat.vx *= -0.5;
    bat.vy *= -0.5;
    bat.target = cave.randomFloorPoint();
  }
  bat.z = 22 + Math.sin(bat.flap * 0.35) * 4;
}

/** The nearest bat within sword reach in the direction the player faces. */
export function findBatInFront(bats, player) {
  const [fx, fy] = player.facingVec;
  let best = null, bestD = Infinity;
  for (const b of bats) {
    const dx = b.x - player.x, dy = b.y - (player.y - 6);
    const d = Math.hypot(dx, dy);
    if (d > REACH || d >= bestD) continue;
    if (d > 12 && dx * fx + dy * fy < d * 0.3) continue; // not in front (unless right on top of us)
    best = b;
    bestD = d;
  }
  return best;
}

/** One sword hit. Returns true if the bat died. */
export function hitBat(world, cave, bat, player) {
  bat.hp--;
  bat.flash = FLASH_TIME;
  // Knock it back away from the player
  const dx = bat.x - player.x, dy = bat.y - player.y;
  const d = Math.hypot(dx, dy) || 1;
  bat.vx = (dx / d) * 180;
  bat.vy = (dy / d) * 180;
  world.addParticle({ x: bat.x, y: bat.y - bat.z - 10, vx: 0, vy: -25, gravity: 0, life: 0.5, text: 'Eek!' });

  if (bat.hp > 0) return false;

  // Poof: a puff of dark fluff, then the wing drops to the floor
  for (let i = 0; i < 12; i++) {
    world.addParticle({
      x: bat.x + (Math.random() - 0.5) * 10, y: bat.y - bat.z + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 50, gravity: 120,
      life: 0.6, size: 2.5, color: i % 2 ? '#3b3046' : '#6b5b78',
    });
  }
  cave.removeBat(bat);
  spawnDrop(world, 'batWing', bat.x, bat.y);
  return true;
}

// ---- Drawing ----

export function drawBat(ctx, b) {
  const x = b.x, y = b.y - b.z;
  const w = Math.sin(b.flap); // wing beat -1..1

  // Shadow on the cave floor
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(ctx, b.x, b.y, 7, 2.5);

  const body = b.flash > 0 ? '#ffffff' : '#3b3046';
  const wing = b.flash > 0 ? '#f0e8ff' : '#4d3f5c';

  // Wings: two pointed membranes that flap up and down
  ctx.fillStyle = wing;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 3, y - 1);
    ctx.lineTo(x + side * 13, y - 4 - w * 7);
    ctx.lineTo(x + side * 11, y + 1 - w * 3);
    ctx.lineTo(x + side * 8, y - 1 - w * 2);
    ctx.lineTo(x + side * 6, y + 3);
    ctx.closePath();
    ctx.fill();
  }
  // Body, ears
  ctx.fillStyle = body;
  ellipse(ctx, x, y, 4, 5);
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 3);
  ctx.lineTo(x - 2.5, y - 8);
  ctx.lineTo(x - 0.5, y - 4);
  ctx.moveTo(x + 3, y - 3);
  ctx.lineTo(x + 2.5, y - 8);
  ctx.lineTo(x + 0.5, y - 4);
  ctx.fill();
  drawBatEyes(ctx, b);
}

/** Eyes are drawn again after the cave darkness so they glow in the dark. */
export function drawBatEyes(ctx, b) {
  const x = b.x, y = b.y - b.z;
  ctx.fillStyle = b.flash > 0 ? '#ff6b6b' : '#ffcf3f';
  ctx.fillRect(x - 2.5, y - 2, 1.6, 1.6);
  ctx.fillRect(x + 1, y - 2, 1.6, 1.6);
}
