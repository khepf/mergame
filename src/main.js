import { World } from './world/world.js';
import { Player } from './player/player.js';
import { Camera } from './core/camera.js';
import { input, isTyping } from './core/input.js';
import { GameUI } from './ui/panels.js';
import { drawHud } from './ui/hud.js';
import { Bicycle } from './player/bicycle.js';
import { TILE } from './core/constants.js';
import { useHeldItem } from './player/actions.js';
import { collectPickups } from './world/pickups.js';
import { readSave, applySave, saveGame, clearSave } from './core/save.js';
import { FountainSound } from './audio/fountainSound.js';
import { HEALTH_SETTINGS } from './player/player.js';
import { formatCoins } from './items/money.js';

const AUTOSAVE_SECONDS = 5;
const NO_INPUT = { axis: () => ({ x: 0, y: 0 }), running: () => false }; // while fainted

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const world = new World(112, 48, 1337);
const player = new Player(world.house.spawn.x, world.house.spawn.y);
const camera = new Camera();

const ui = new GameUI(player);
const house = world.house;
house.onChestClick = () =>
  ui.toggleChest(house.chest, {
    onOpen: () => (house.chestState.open = true),
    onClose: () => (house.chestState.open = false),
  });

world.notify = (msg, kind) => ui.toast(msg, kind); // signs, pickups etc. talk to the player via toasts

// The General Store: click the merchant (from the counter) to trade.
const store = world.town.store;
store.onMerchantClick = () => {
  if (ui.shopOpen) ui.closeShop();
  else if (store.inRange(player)) ui.openShop(store);
  else ui.toast(`Walk up to the counter to talk to ${store.def.merchant}`);
};

// The Bank: click the teller (from the counter) to deposit or withdraw coins.
const bank = world.town.bank;
bank.onTellerClick = () => {
  if (ui.bankOpen) ui.closeBank();
  else if (bank.inRange(player)) ui.openBank(bank);
  else ui.toast(`Walk up to the counter to talk to ${bank.def.teller}`);
};

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

// ---- Saving: load on start, autosave whenever something changes ----
const game = { player, world, bike };
const saved = readSave();
if (saved) {
  try {
    applySave(saved, game);
    ui.render();
    ui.toast('Welcome back! Your progress was loaded.');
  } catch (err) {
    console.warn('Could not load saved game:', err);
  }
}
// Don't fade the roof on load if we start indoors.
house.roofAlpha = house.contains(player.x, player.y) ? 0 : 1;

let savingEnabled = true;
function autosave() {
  if (!savingEnabled) return;
  if (saveGame(game) === 'saved') ui.flashSaved();
}
setInterval(autosave, AUTOSAVE_SECONDS * 1000);
document.addEventListener('visibilitychange', () => document.hidden && autosave());
window.addEventListener('pagehide', autosave);

ui.onNewGame = () => {
  if (!confirm('Start a new game? Your saved progress will be erased.')) return;
  savingEnabled = false; // don't re-save the old game on the way out
  clearSave();
  location.reload();
};

// Browsers only allow audio after the player interacts, so start it on the first key/click.
const fountainSound = new FountainSound();
for (const evt of ['keydown', 'pointerdown']) window.addEventListener(evt, () => fountainSound.unlock());

window.addEventListener('keydown', (e) => {
  if (isTyping(e) || faint) return;
  if (e.code === 'KeyE' && !e.repeat) toggleBike();
  if (e.code === 'Space' && !ui.panelOpen) useHeldItem(player, world); // hold to keep swinging
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

// ---- Fainting: health hits 0 -> fade out, wake up at home ----
const FAINT_FADE = 1.6; // seconds to fade out (and again to fade back in)
let faint = null; // { t, woke, lost } while fainting

function updateFaint(dt) {
  if (!faint && player.fainted) {
    faint = { t: 0, woke: false, lost: 0 };
    ui.closePanels();
  }
  if (!faint) return;
  faint.t += dt;
  if (!faint.woke && faint.t >= FAINT_FADE) {
    // Wake up at home with full health, a little lighter in the purse
    if (player.bike) player.dismount(world);
    faint.lost = Math.floor(player.wallet.total * HEALTH_SETTINGS.faintCoinLoss);
    if (faint.lost > 0) player.wallet.spend(faint.lost);
    player.x = house.spawn.x;
    player.y = house.spawn.y;
    player.dir = 'down';
    player.health = player.maxHealth;
    player.hurtTimer = 0;
    house.roofAlpha = 0;
    camera.follow(player.x, player.y - 12, world, 0, true);
    faint.woke = true;
    ui.toast(faint.lost > 0
      ? `You fainted and woke up at home. You dropped ${formatCoins(faint.lost)} on the way.`
      : 'You fainted and woke up at home.');
  }
  if (faint.t >= FAINT_FADE * 2) faint = null;
}

function drawFaint() {
  if (!faint) return;
  const a = faint.woke ? 1 - (faint.t - FAINT_FADE) / FAINT_FADE : faint.t / FAINT_FADE;
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, Math.min(1, a))})`;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  if (!faint.woke) {
    ctx.globalAlpha = Math.min(1, a * 1.5);
    ctx.fillStyle = '#f3ead8';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('You fainted…', window.innerWidth / 2, window.innerHeight / 2);
    ctx.textAlign = 'start';
    ctx.globalAlpha = 1;
  }
}

function update(dt) {
  updateFaint(dt);
  player.update(dt, faint ? NO_INPUT : input, world);
  ui.setHealth(player.health, player.maxHealth);
  world.update(dt);
  collectPickups(world, player);
  const inside = house.contains(player.x, player.y);
  house.update(dt, inside);
  if (ui.chestOpen && !inside) ui.closeChest(); // walked away from the chest
  store.merchant.near = store.inRange(player);
  if (ui.shopOpen && !store.merchant.near) ui.closeShop(); // walked away from the counter
  bank.teller.near = bank.inRange(player);
  if (ui.bankOpen && !bank.teller.near) ui.closeBank();
  world.cave.update(dt, player); // bats + fading the hill when you walk in
  const f = world.town.fountain;
  fountainSound.update(Math.hypot(player.x - f.x, player.y - f.y));
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
  world.drawParticles(ctx);

  world.house.drawRoof(ctx);
  world.cave.drawOverlay(ctx);

  // Cave darkness (screen space, centered on the player), then bat eyes glowing through it
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  world.cave.drawDarkness(
    ctx, (player.x - camera.x) * zoom, (player.y - 14 - camera.y) * zoom, zoom, canvas.width, canvas.height);
  ctx.setTransform(zoom, 0, 0, zoom, -Math.round(camera.x * zoom), -Math.round(camera.y * zoom));
  world.cave.drawGlowingEyes(ctx);

  // Screen space HUD
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawHud(ctx, world, player);
  drawFaint();
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

canvas.addEventListener('click', (e) => !faint && interactableAt(screenToWorld(e))?.onClick());
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
