// DOM-based inventory UI: the player's bag bar and the chest panel.
import { ITEMS, iconUrl } from './items.js';

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

export class InventoryUI {
  constructor(bag) {
    this.bag = bag;
    this.chest = null; // { inventory, onClose } while a chest is open

    const root = document.getElementById('ui');

    this.hotbar = el('div', 'hotbar');
    root.appendChild(this.hotbar);

    this.panel = el('div', 'panel hidden');
    root.appendChild(this.panel);

    this.toastEl = el('div', 'toast hidden');
    root.appendChild(this.toastEl);

    bag.onChange(() => this.render());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.chest) this.closeChest();
    });
    this.render();
  }

  get chestOpen() {
    return this.chest !== null;
  }

  toggleChest(inventory, hooks = {}) {
    if (this.chest) this.closeChest();
    else this.openChest(inventory, hooks);
  }

  openChest(inventory, { onOpen, onClose } = {}) {
    const unsubscribe = inventory.onChange(() => this.render());
    this.chest = { inventory, onClose, unsubscribe };
    onOpen?.();
    this.render();
  }

  closeChest() {
    if (!this.chest) return;
    const { onClose, unsubscribe } = this.chest;
    unsubscribe();
    this.chest = null;
    onClose?.();
    this.render();
  }

  render() {
    // Bag bar (hidden while the chest panel is open: the panel shows the bag too)
    this.hotbar.replaceChildren(...this.slotEls(this.bag, null, true));
    this.hotbar.classList.toggle('hidden', this.chestOpen);

    if (!this.chest) {
      this.panel.classList.add('hidden');
      return;
    }
    const chestInv = this.chest.inventory;
    this.panel.replaceChildren(
      el('div', 'panel-title', 'Chest'),
      row(this.slotEls(chestInv, (i) => this.move(chestInv, i, this.bag, 'Your bag is full'))),
      el('div', 'panel-title', 'Your bag'),
      row(this.slotEls(this.bag, (i) => this.move(this.bag, i, chestInv, 'The chest is full'))),
      el('div', 'panel-hint', 'Click an item to move it  ·  Esc to close'),
      closeButton(() => this.closeChest()),
    );
    this.panel.classList.remove('hidden');
  }

  move(from, i, to, fullMsg) {
    if (!from.slots[i]) return;
    if (!from.transfer(i, to)) this.toast(fullMsg, 'error');
  }

  slotEls(inv, onClick, numbered = false) {
    return inv.slots.map((item, i) => {
      const slot = el('div', 'slot' + (item ? ' filled' : ''));
      if (numbered) slot.appendChild(el('span', 'slot-num', String(i + 1)));
      if (item) {
        const def = ITEMS[item.type];
        const img = el('img');
        img.src = iconUrl(item.type);
        img.alt = def.name;
        slot.appendChild(img);
        slot.title = `${def.name}\n${def.description}`;
      }
      if (onClick && item) slot.addEventListener('click', () => onClick(i));
      return slot;
    });
  }

  /** kind: 'info' | 'error' */
  toast(msg, kind = 'info') {
    this.toastEl.textContent = msg;
    this.toastEl.className = `toast ${kind}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), 2600);
  }
}

function row(children) {
  const r = el('div', 'slot-row');
  r.replaceChildren(...children);
  return r;
}

function closeButton(onClick) {
  const b = el('button', 'panel-close', '×');
  b.title = 'Close';
  b.addEventListener('click', onClick);
  return b;
}
