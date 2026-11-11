// Save / load game progress in the browser (localStorage).
// The world itself is generated from a fixed seed, so we only store what the player changed.
import { ITEMS } from '../items/items.js';
import { restoreFelledTree } from '../world/trees.js';
import { spawnDrop } from '../world/pickups.js';

const KEY = 'mergame.save';
const VERSION = 1;

/** Plain-data snapshot of everything worth keeping. */
export function snapshot({ player, world, bike }) {
  return {
    version: VERSION,
    player: {
      x: Math.round(player.x),
      y: Math.round(player.y),
      dir: player.dir,
      selected: player.selected,
      riding: !!player.bike,
      bag: slotsData(player.inventory),
      coins: player.wallet.total,
      bank: player.bank.total,
    },
    bike: { x: Math.round(bike.x), y: Math.round(bike.y), facing: bike.facing },
    chest: slotsData(world.house.chest),
    felledTrees: [...world.felled],
    drops: world.objects
      .filter((o) => o.kind === 'pickup')
      .map((o) => ({ type: o.item.type, count: o.item.count, x: Math.round(o.x), y: Math.round(o.y) })),
  };
}

const slotsData = (inv) => inv.slots.map((s) => (s ? { type: s.type, count: s.count } : null));

export function readSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.version === VERSION ? data : null;
  } catch {
    return null; // corrupt save or storage unavailable: start fresh
  }
}

let lastJson = null;

/** Save if anything changed since the last save. Returns 'saved' | 'unchanged' | 'failed'. */
export function saveGame(game) {
  const json = JSON.stringify(snapshot(game));
  if (json === lastJson) return 'unchanged';
  try {
    localStorage.setItem(KEY, json);
    lastJson = json;
    return 'saved';
  } catch {
    return 'failed'; // storage full or disabled (e.g. some private browsing modes)
  }
}

export function clearSave() {
  lastJson = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Apply a saved game onto a freshly generated world. */
export function applySave(data, { player, world, bike }) {
  restoreSlots(player.inventory, data.player.bag);
  restoreSlots(world.house.chest, data.chest);
  player.wallet.total = Math.max(0, Math.floor(data.player.coins) || 0);
  player.wallet.emit();
  player.bank.total = Math.max(0, Math.floor(data.player.bank) || 0); // older saves: no account yet
  player.bank.emit();

  for (const key of data.felledTrees ?? []) {
    const [tx, ty] = key.split(',').map(Number);
    restoreFelledTree(world, tx, ty);
  }
  for (const d of data.drops ?? []) {
    if (ITEMS[d.type]) spawnDrop(world, d.type, d.x, d.y, d.count, false);
  }

  player.x = data.player.x;
  player.y = data.player.y;
  player.dir = data.player.dir ?? 'down';
  player.selected = data.player.selected ?? 0;

  if (data.player.riding) {
    // The bike is wherever the rider is
    bike.x = player.x;
    bike.y = player.y;
    bike.facing = player.dir;
    player.mount(bike);
  } else {
    bike.x = data.bike.x;
    bike.y = data.bike.y;
    bike.facing = data.bike.facing;
  }
}

function restoreSlots(inv, saved) {
  if (!Array.isArray(saved)) return;
  inv.slots = inv.slots.map((_, i) => {
    const s = saved[i];
    return s && ITEMS[s.type] && s.count > 0 ? { type: s.type, count: s.count } : null;
  });
  inv.emit();
}
