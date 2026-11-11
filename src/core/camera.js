import { clamp } from './utils.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.w = 0; // view size in world pixels
    this.h = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
  }

  follow(tx, ty, world, dt, snap = false) {
    let gx = tx - this.w / 2;
    let gy = ty - this.h / 2;
    gx = world.pxWidth <= this.w ? (world.pxWidth - this.w) / 2 : clamp(gx, 0, world.pxWidth - this.w);
    gy = world.pxHeight <= this.h ? (world.pxHeight - this.h) / 2 : clamp(gy, 0, world.pxHeight - this.h);
    if (snap) {
      this.x = gx;
      this.y = gy;
    } else {
      const k = 1 - Math.exp(-dt * 8);
      this.x += (gx - this.x) * k;
      this.y += (gy - this.y) * k;
    }
  }
}
