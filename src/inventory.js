// A fixed-size set of item slots. Used for the player's bag, chests, and anything
// else that holds items. Each slot holds one item ({ type }) or null.
export class Inventory {
  constructor(size, items = []) {
    this.slots = new Array(size).fill(null);
    this.listeners = new Set();
    for (const it of items) this.add(it);
  }

  get size() {
    return this.slots.length;
  }

  get isFull() {
    return this.firstEmpty() === -1;
  }

  firstEmpty() {
    return this.slots.indexOf(null);
  }

  /** Put an item in the first free slot. Returns false if full. */
  add(item) {
    const i = this.firstEmpty();
    if (i === -1) return false;
    this.slots[i] = item;
    this.emit();
    return true;
  }

  /** Remove and return the item in slot i (or null). */
  take(i) {
    const item = this.slots[i];
    if (!item) return null;
    this.slots[i] = null;
    this.emit();
    return item;
  }

  /** Move the item in slot i into another inventory. Returns false if it didn't fit. */
  transfer(i, target) {
    const item = this.slots[i];
    if (!item || !target.add(item)) return false;
    this.slots[i] = null;
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
