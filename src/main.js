import { World } from './world.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { input } from './input.js';
import { rrect } from './utils.js';
import { InventoryUI } from './ui.js';
import { Bicycle } from './bicycle.js';
import { TILE } from './constants.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const world = new World(112, 48, 1337);
const player = new Player(world.house.spawn.x, world.house.spawn.y);
const camera = new Camera();
// Don't fade the roof on load if we start indoors.
world.house.roofAlpha = world.house.contains(player.x, player.y) ? 0 : 1;

const ui = new InventoryUI(player.inventory);
const house = world.house;
house.onChestClick = () =>
  ui.toggleChest(house.chest, {
    onOpen: () => (house.chestState.open = true),
    onClose: () => (house.chestState.open = false),
  });

world.notify = (msg) => ui.toast(msg); // signs etc. talk to the player through toasts

// The bike starts parked outside the front door, beside the doormat.
const bike = new Bicycle((house.door.x + 1) * TILE + 22, (house.door.y + 1) * TILE + 26, 'left');
bike.canInteract = () => !bike.ridden;
bike.onClick = () => toggleBike();
world.addObject(bike);

function toggleBike() {
  if (player.bike) player.dismount(world);
  else if (player.canMount(bike)) player.mount(bike);
  else ui.toast(player.swimming ? "You can't ride while swimming" : 'Walk up to the bike to ride it');
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && !e.repeat) toggleBike();
});

let zoom = 2;
let dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  // Aim for roughly 15-ish tiles of vertical view regardless of screen size.
  zoom = Math.max(1, Math.round(canvas.height / 480));
  camera.resize(canvas.width / zoom, canvas.height / zoom);
  camera.follow(player.x, player.y - 12, world, 0, true);
}
window.addEventListener('resize', resize);
resize();

function update(dt) {
  player.update(dt, input, world);
  const inside = house.contains(player.x, player.y);
  house.update(dt, inside);
  if (ui.chestOpen && !inside) ui.closeChest(); // walked away from the chest
  camera.follow(player.x, player.y - 12, world, dt);
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1d2b1f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // World space
  ctx.setTransform(zoom, 0, 0, zoom, -Math.round(camera.x * zoom), -Math.round(camera.y * zoom));
  world.drawGround(ctx, camera);

  const drawables = world.visibleObjects(camera);
  drawables.push(player);
  drawables.sort((a, b) => a.y - b.y); // things lower on screen draw on top
  for (const d of drawables) d.draw(ctx);

  world.house.drawRoof(ctx);

  // Screen space HUD
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawHud();
}

function drawHud() {
  const inside = world.house.contains(player.x, player.y);
  const label = inside ? 'Home' : player.swimming ? 'Pond' : world.regionAt(player.x, player.y);
  ctx.font = '600 15px system-ui, sans-serif';
  const w = ctx.measureText(label).width + 24;
  ctx.fillStyle = 'rgba(15, 20, 25, 0.6)';
  rrect(ctx, 12, 12, w, 30, 8);
  ctx.fillStyle = '#f3ead8';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 24, 27);

  drawRadioHud(inside);

  // Controls hint, tucked under the location label so it never collides with the bag bar
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const hint = 'WASD / Arrows: move  ·  Shift: run  ·  E: bike  ·  Click: interact';
  ctx.fillText(hint, 15, 57);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(hint, 14, 56);
}

function drawRadioHud(inside) {
  const radio = world.house.radio;
  let lines = null;
  if (inside && radio.state === 'tuning') lines = ['♪ Tuning in…'];
  else if (inside && radio.state === 'playing') {
    const show = radio.show;
    lines = [
      `♪ ${show.title}`,
      `${radio.currentTrack.title}  (${radio.trackIndex + 1}/${show.tracks.length})`,
    ];
  } else if (inside && radio.error && performance.now() - radio.errorAt < 4000) {
    lines = ['♪ No signal. Try again.'];
  }
  if (!lines) return;

  ctx.font = '600 14px system-ui, sans-serif';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28;
  const h = 14 + lines.length * 20;
  const x = window.innerWidth - w - 12;
  ctx.fillStyle = 'rgba(15, 20, 25, 0.65)';
  rrect(ctx, x, 12, w, h, 8);
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.font = i === 0 ? '600 14px system-ui, sans-serif' : '13px system-ui, sans-serif';
    ctx.fillStyle = i === 0 ? '#ffd98a' : '#f3ead8';
    ctx.fillText(l, x + 14, 12 + 17 + i * 20);
  });
}

// ---- Mouse: click things in the world ----

function screenToWorld(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) * dpr, sy = (e.clientY - rect.top) * dpr;
  return {
    x: (sx + Math.round(camera.x * zoom)) / zoom,
    y: (sy + Math.round(camera.y * zoom)) / zoom,
  };
}

function interactableAt(p) {
  // Topmost first (highest y draws last)
  const hits = world.visibleObjects(camera).filter((o) => {
    const b = o.hitbox;
    return b && o.canInteract() && p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
  });
  return hits.sort((a, b) => b.y - a.y)[0] ?? null;
}

canvas.addEventListener('click', (e) => interactableAt(screenToWorld(e))?.onClick());
canvas.addEventListener('mousemove', (e) => {
  canvas.style.cursor = interactableAt(screenToWorld(e)) ? 'pointer' : 'default';
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
