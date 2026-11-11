import { ellipse, circle, rrect } from '../core/utils.js';
import { Inventory } from '../items/inventory.js';
import { Wallet } from '../items/money.js';
import { NO_RIDE_TILES } from '../core/constants.js';
import { drawBike, drawHandlebar, WHEEL_R } from './bicycle.js';

// Collision box relative to the feet position (x, y).
const HALF_W = 7;
const BOX_H = 6;

const SWIM_DEPTH = 16; // px the body sinks: leaves head + shoulders above water
const RIPPLE_LIFE = 1.2; // seconds
const SWING_TIME = 0.38; // seconds per tool swing
const SWING_HIT_AT = 0.45; // fraction of the swing when it connects
const MOUNT_RANGE = 36; // px: how close you must be to hop on a bike

export class Player {
  constructor(x, y) {
    this.x = x; // feet position in world pixels
    this.y = y;
    this.walkSpeed = 110;
    this.runSpeed = 185;
    this.inventory = new Inventory(5); // the player's bag
    this.wallet = new Wallet(0); // coins in the purse, counted in bronze
    this.bank = new Wallet(0); // coins deposited at the bank
    this.selected = 0; // which bag slot is in hand
    this.swing = null; // { t, onHit, hit } while swinging a tool
    this.swimSpeed = 60;
    this.swimFastSpeed = 90;
    this.rideSpeed = 240;
    this.rideFastSpeed = 330;

    // Bicycle
    this.bike = null; // the Bicycle being ridden, if any
    this.wheelAngle = 0;
    this.pedalAngle = 0;
    this.dir = 'down';
    this.moving = false;
    this.animTime = 0;

    // Swimming
    this.swimming = false;
    this.sink = 0; // how far the body has sunk into the water (px), eases in/out
    this.ripples = []; // { x, y, age }
    this.rippleTimer = 0;
    this.time = 0;
  }

  update(dt, input, world) {
    this.time += dt;
    this.swimming = !this.bike && world.isWater(this.x, this.y - 2);
    const targetSink = this.swimming ? SWIM_DEPTH : 0;
    this.sink += (targetSink - this.sink) * Math.min(1, dt * 10);
    this.updateRipples(dt);
    this.updateSwing(dt);

    let { x: ax, y: ay } = input.axis();
    this.moving = !this.swing && (ax !== 0 || ay !== 0); // plant your feet while swinging
    if (!this.moving) {
      this.animTime = 0;
      return;
    }

    this.updateFacing(ax, ay);
    const len = Math.hypot(ax, ay);
    const running = input.running();
    let speed;
    if (this.bike) speed = running ? this.rideFastSpeed : this.rideSpeed;
    else if (this.swimming) speed = running ? this.swimFastSpeed : this.swimSpeed;
    else speed = running ? this.runSpeed : this.walkSpeed;

    // Move each axis separately so we slide along walls instead of sticking.
    const extra = this.bike ? NO_RIDE_TILES : null;
    const moved =
      this.moveBy(world, (ax / len) * speed * dt, 0, extra) +
      this.moveBy(world, 0, (ay / len) * speed * dt, extra);
    this.animTime += dt * (running ? 1.5 : 1);

    if (this.bike) {
      // Wheels and pedals turn with distance actually travelled
      const spin = this.dir === 'left' ? -1 : 1;
      this.wheelAngle += (moved / WHEEL_R) * spin;
      this.pedalAngle += (moved / 9) * spin;
    }
  }

  // ---- Tools ----

  /** Type of the item in the selected bag slot, or null. */
  get heldType() {
    return this.inventory.slots[this.selected]?.type ?? null;
  }

  /** Start a tool swing; onHit fires when the swing connects. Returns false if mid-swing. */
  startSwing(onHit) {
    if (this.swing) return false;
    this.swing = { t: 0, onHit, hit: false };
    return true;
  }

  updateSwing(dt) {
    const s = this.swing;
    if (!s) return;
    s.t += dt;
    if (!s.hit && s.t >= SWING_TIME * SWING_HIT_AT) {
      s.hit = true;
      s.onHit?.();
    }
    if (s.t >= SWING_TIME) this.swing = null;
  }

  /** Unit vector the player is facing. */
  get facingVec() {
    return { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir];
  }

  // ---- Bicycle ----

  canMount(bike) {
    return !this.bike && !bike.ridden && !this.swimming &&
      Math.hypot(bike.x - this.x, bike.y - this.y) < MOUNT_RANGE;
  }

  mount(bike) {
    this.bike = bike;
    bike.ridden = true;
    this.x = bike.x;
    this.y = bike.y;
    this.dir = bike.facing;
  }

  dismount(world) {
    const bike = this.bike;
    if (!bike) return;
    bike.x = this.x;
    bike.y = this.y;
    bike.facing = this.dir;
    bike.ridden = false;
    this.bike = null;
    // Step off to stand just in front of the bike
    this.moveBy(world, 0, 10);
  }

  updateRipples(dt) {
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter((r) => r.age < RIPPLE_LIFE);
    if (!this.swimming) return;
    this.rippleTimer -= dt;
    if (this.rippleTimer <= 0) {
      this.ripples.push({ x: this.x, y: this.y - 2, age: 0 });
      this.rippleTimer = this.moving ? 0.3 : 0.9;
    }
  }

  updateFacing(ax, ay) {
    if (ax !== 0 && ay !== 0) {
      // Diagonal: keep current facing if it's one of the two directions
      const keep =
        (ax < 0 && this.dir === 'left') || (ax > 0 && this.dir === 'right') ||
        (ay < 0 && this.dir === 'up') || (ay > 0 && this.dir === 'down');
      if (!keep) this.dir = ax < 0 ? 'left' : 'right';
    } else if (ax !== 0) {
      this.dir = ax < 0 ? 'left' : 'right';
    } else {
      this.dir = ay < 0 ? 'up' : 'down';
    }
  }

  /** Move in small steps until blocked. Returns the distance actually moved. */
  moveBy(world, dx, dy, extraSolid = null) {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2);
    if (steps === 0) return 0;
    const sx = dx / steps, sy = dy / steps;
    let i = 0;
    for (; i < steps; i++) {
      if (world.collides(this.x + sx - HALF_W, this.y + sy - BOX_H, HALF_W * 2, BOX_H, extraSolid)) break;
      this.x += sx;
      this.y += sy;
    }
    return Math.hypot(sx, sy) * i;
  }

  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);

    // Expanding rings left behind on the water
    for (const r of this.ripples) {
      const p = r.age / RIPPLE_LIFE;
      ctx.strokeStyle = `rgba(220, 240, 255, ${0.55 * (1 - p)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, 9 + p * 14, 3.5 + p * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.bike) {
      this.drawRiding(ctx, x, y);
      return;
    }

    if (this.sink < 0.5) {
      const axe = this.heldType === 'axe';
      if (axe && this.dir === 'up') this.drawAxe(ctx, x, y); // behind the body
      this.drawBody(ctx, x, y, true);
      if (axe && this.dir !== 'up') this.drawAxe(ctx, x, y);
      return;
    }

    // In water: draw the body sunk down, clipped at the water surface.
    const surface = y - 2;
    const tread = Math.sin(this.time * 3) * 1; // gentle bob while treading water
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 30, surface - 60, 60, 60);
    ctx.clip();
    this.drawBody(ctx, x, Math.round(y + this.sink + tread), false);
    ctx.restore();

    // Water line around the body
    const fade = Math.min(1, this.sink / SWIM_DEPTH);
    ctx.fillStyle = `rgba(61, 127, 196, ${0.6 * fade})`;
    ellipse(ctx, x, surface, 10, 3.5);
    ctx.strokeStyle = `rgba(230, 245, 255, ${0.8 * fade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, surface, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Splashy strokes: arms breaking the surface while swimming
    if (this.moving && this.swimming) {
      const s = Math.sin(this.animTime * 9);
      ctx.fillStyle = `rgba(240, 250, 255, ${0.8 * fade})`;
      circle(ctx, x - 9, surface - 1 - Math.max(0, s) * 3, 1.5 + Math.max(0, s));
      circle(ctx, x + 9, surface - 1 - Math.max(0, -s) * 3, 1.5 + Math.max(0, -s));
    }
  }

  drawBody(ctx, x, y, shadow) {
    const swing = this.moving ? Math.sin(this.animTime * 14) : 0;
    const bob = this.moving ? Math.abs(swing) * 1.5 : 0;
    const side = this.dir === 'left' || this.dir === 'right';
    const facing = this.dir === 'left' ? -1 : 1;

    if (shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ellipse(ctx, x, y - 1, 8, 3.5);
    }

    // Legs + boots
    const legTop = y - 9;
    if (side) {
      this.leg(ctx, x - 2 + swing * 3, legTop, 8);
      this.leg(ctx, x - 2 - swing * 3, legTop, 8);
    } else {
      this.leg(ctx, x - 5, legTop, 8 - Math.max(0, swing) * 2);
      this.leg(ctx, x + 1, legTop, 8 - Math.max(0, -swing) * 2);
    }

    this.drawUpper(ctx, x, y - 8 - bob, swing, 'walk');
  }

  /** Torso, arms and head. by = bottom of the torso. armMode: 'walk' | 'none'. */
  drawUpper(ctx, x, by, swing, armMode) {
    const side = this.dir === 'left' || this.dir === 'right';
    const facing = this.dir === 'left' ? -1 : 1;

    // Back arm (side view) drawn behind body
    if (side && armMode === 'walk') this.arm(ctx, x - 2 - swing * 3, by - 11, '#24548a');

    // Tunic + belt
    ctx.fillStyle = '#2f6fb5';
    rrect(ctx, x - 7, by - 12, 14, 13, 3);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(x - 7, by - 3, 14, 2);
    ctx.fillStyle = '#e1b941';
    ctx.fillRect(x - 1, by - 3, 2, 2);

    // Arms
    if (armMode === 'walk') {
      if (side) {
        this.arm(ctx, x - 2 + swing * 3, by - 11, '#2a5f9c');
      } else {
        this.arm(ctx, x - 9, by - 11 + swing * 1.5, '#2a5f9c');
        this.arm(ctx, x + 6, by - 11 - swing * 1.5, '#2a5f9c');
      }
    }

    // Head
    const hy = by - 18;
    ctx.fillStyle = '#f2c792';
    circle(ctx, x, hy, 7);

    // Hair + face
    ctx.fillStyle = '#6b3e1f';
    if (this.dir === 'up') {
      circle(ctx, x, hy - 0.5, 7.5);
    } else {
      ctx.beginPath();
      ctx.arc(x, hy - 1, 7.5, Math.PI, 0);
      ctx.fill();
      if (side) {
        // hair covers the back of the head
        ctx.fillRect(facing > 0 ? x - 7.5 : x + 1, hy - 2, 6.5, 6);
        ctx.fillStyle = '#222';
        ctx.fillRect(x + facing * 4 - 1, hy + 1, 2, 3);
      } else {
        ctx.fillRect(x - 7.5, hy - 2, 15, 2);
        ctx.fillStyle = '#222';
        ctx.fillRect(x - 4, hy + 1, 2, 3);
        ctx.fillRect(x + 2, hy + 1, 2, 3);
      }
    }
  }

  drawRiding(ctx, x, y) {
    const side = this.dir === 'left' || this.dir === 'right';
    const f = this.dir === 'left' ? -1 : 1;

    if (side) {
      // Geometry matches drawBikeSide() in bicycle.js
      const bb = { x: x - f, y: y - WHEEL_R };
      const seat = { x: x - f * 5, y: y - 20 };
      const hip = { x: seat.x + f, y: seat.y - 2 };
      const grip = { x: x + f * 3, y: y - 25 };
      const a = this.pedalAngle;
      const pedal = (k) => ({
        x: bb.x + Math.cos(a + k * Math.PI) * 4,
        y: bb.y + Math.sin(a + k * Math.PI) * 4,
      });

      this.bikeLeg(ctx, hip, pedal(1), f, '#2c2740'); // far leg, behind the frame
      drawBike(ctx, x, y, this.dir, this.wheelAngle);
      this.bikeLeg(ctx, hip, pedal(0), f, '#3a3350');
      const by = seat.y - 1;
      this.drawUpper(ctx, hip.x, by, 0, 'none');
      // Arm reaching forward to the handlebars
      ctx.strokeStyle = '#2a5f9c';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hip.x + f, by - 10);
      ctx.lineTo(grip.x, grip.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#f2c792';
      ctx.fillRect(grip.x - 1.5, grip.y - 1.5, 3, 3);
      return;
    }

    // Front / back view
    drawBike(ctx, x, y, this.dir, this.wheelAngle);
    const s = Math.sin(this.pedalAngle);
    const legTop = y - 19;
    this.leg(ctx, x - 5, legTop, 12 + s * 2);
    this.leg(ctx, x + 1, legTop, 12 - s * 2);
    this.drawUpper(ctx, x, legTop, 0, 'walk');
    if (this.dir === 'down') drawHandlebar(ctx, x, y);
  }

  /** Axe in hand: hangs at your side, or arcs through a swing. */
  drawAxe(ctx, x, y) {
    const side = this.dir === 'left' || this.dir === 'right';
    const f = this.dir === 'left' ? -1 : 1;
    const by = y - 8;
    const px = side ? x + f : this.dir === 'down' ? x + 7 : x - 7;
    const py = by - 9;

    let a = 1.25; // resting: pointing down and a little forward
    if (this.swing) {
      const p = Math.min(1, this.swing.t / (SWING_TIME * SWING_HIT_AT));
      a = -2.2 + (1 - (1 - p) * (1 - p)) * 3.1; // raised behind the head -> chop forward
    }

    ctx.save();
    ctx.translate(px, py);
    if (side) ctx.scale(f, 1);
    ctx.rotate(a);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, -1, 15, 2.5);
    ctx.fillStyle = '#9aa0a8';
    ctx.beginPath();
    ctx.moveTo(11, -1.5);
    ctx.lineTo(16, -1.5);
    ctx.lineTo(18, 6);
    ctx.lineTo(11, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e1e6ec';
    ctx.fillRect(16.5, 0, 1.5, 6);
    ctx.restore();
  }

  bikeLeg(ctx, hip, foot, f, color) {
    const knee = { x: (hip.x + foot.x) / 2 + f * 3, y: (hip.y + foot.y) / 2 - 1 };
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();
    ctx.fillStyle = '#4a2f1d';
    ctx.fillRect(foot.x - 2, foot.y - 1, 5, 3);
  }

  leg(ctx, x, top, h) {
    ctx.fillStyle = '#3a3350';
    ctx.fillRect(x, top, 4, h - 2);
    ctx.fillStyle = '#4a2f1d';
    ctx.fillRect(x, top + h - 2, 4, 2);
  }

  arm(ctx, x, top, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, top, 3, 8);
    ctx.fillStyle = '#f2c792';
    ctx.fillRect(x, top + 8, 3, 2);
  }
}
