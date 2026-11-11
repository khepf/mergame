// A fixed-size set of item slots. Used for the player's bag, chests, and anything
// else that holds items. Each slot is null or a stack: { type, count }.
// Some items stack (e.g. wood, up to its max); tools take a whole slot each.
import { maxStack } from './items.js';

export class Inventory {
  constructor(size, items = []) {
    this.slots = new Array(size).fill(null);
    this.listeners = new Set();
    for (const it of items) this.add(it);
  }

  get size() {
    return this.slots.length;
  }

  /** How many of this item type could still be added. */
  spaceFor(type) {
    const max = maxStack(type);
    let space = 0;
    for (const s of this.slots) {
      if (s === null) space += max;
      else if (s.type === type) space += max - s.count;
    }
    return space;
  }

  /**
   * Add items, topping up existing stacks first, then empty slots.
   * Returns how many did NOT fit (0 = everything was added).
   */
  add(item) {
    const max = maxStack(item.type);
    let left = item.count ?? 1;
    for (const s of this.slots) {
      if (left === 0) break;
      if (s && s.type === item.type && s.count < max) {
        const n = Math.min(left, max - s.count);
        s.count += n;
        left -= n;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i] === null) {
        const n = Math.min(left, max);
        this.slots[i] = { type: item.type, count: n };
        left -= n;
      }
    }
    if (left !== (item.count ?? 1)) this.emit();
    return left;
  }

  /** Total number of an item type across all slots. */
  count(type) {
    return this.slots.reduce((n, s) => n + (s && s.type === type ? s.count : 0), 0);
  }

  /** Remove up to n of an item type (from the last stacks first). Returns how many were removed. */
  remove(type, n) {
    let removed = 0;
    for (let i = this.slots.length - 1; i >= 0 && removed < n; i--) {
      const s = this.slots[i];
      if (!s || s.type !== type) continue;
      const k = Math.min(s.count, n - removed);
      s.count -= k;
      removed += k;
      if (s.count === 0) this.slots[i] = null;
    }
    if (removed) this.emit();
    return removed;
  }

  /** Remove and return the stack in slot i (or null). */
  take(i) {
    const item = this.slots[i];
    if (!item) return null;
    this.slots[i] = null;
    this.emit();
    return item;
  }

  /** Move the stack in slot i into another inventory (as much as fits). Returns false if none moved. */
  transfer(i, target) {
    const item = this.slots[i];
    if (!item) return false;
    const left = target.add({ type: item.type, count: item.count });
    if (left === item.count) return false;
    if (left === 0) this.slots[i] = null;
    else item.count = left;
    this.emit();
    return true;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this);
  }
}
