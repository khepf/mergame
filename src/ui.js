// DOM-based UI: the player's bag bar + coin purse, the chest panel, the shop panel, and toasts.
import { ITEMS, iconUrl, makeItem } from './items.js';
import { COINS, splitCoins, formatCoins } from './money.js';

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class InventoryUI {
  constructor(player) {
    this.player = player;
    const bag = (this.bag = player.inventory);
    this.wallet = player.wallet;
    this.chest = null; // { inventory, onClose, unsubscribe } while a chest is open
    this.shop = null; // { store } while a shop is open

    const root = document.getElementById('ui');

    const bottom = el('div', 'bottom-bar');
    this.hotbar = el('div', 'hotbar');
    this.purse = el('div', 'purse');
    bottom.append(this.hotbar, this.purse);
    root.appendChild(bottom);

    this.panel = el('div', 'panel hidden');
    root.appendChild(this.panel);

    this.toastEl = el('div', 'toast hidden');
    root.appendChild(this.toastEl);

    // Save status + new game, tucked in the bottom-right corner
    this.onNewGame = null; // set by the game
    const corner = el('div', 'corner');
    this.savedEl = el('span', 'saved-indicator', 'Saved');
    const newGame = el('button', 'btn btn-small', 'New game');
    newGame.title = 'Erase saved progress and start over';
    newGame.addEventListener('click', () => this.onNewGame?.());
    corner.append(this.savedEl, newGame);
    root.appendChild(corner);

    bag.onChange(() => this.render());
    this.wallet.onChange(() => this.render());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.closePanels();
      // 1-5 pick which bag slot is in your hands
      const n = /^Digit([1-9])$/.exec(e.code);
      if (n && Number(n[1]) <= bag.size) this.select(Number(n[1]) - 1);
    });
    this.render();
  }

  get chestOpen() {
    return this.chest !== null;
  }

  get shopOpen() {
    return this.shop !== null;
  }

  get panelOpen() {
    return this.chestOpen || this.shopOpen;
  }

  closePanels() {
    this.closeChest();
    this.closeShop();
  }

  // ---- Chest ----

  toggleChest(inventory, hooks = {}) {
    if (this.chest) this.closeChest();
    else this.openChest(inventory, hooks);
  }

  openChest(inventory, { onOpen, onClose } = {}) {
    this.closeShop();
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

  // ---- Shop ----

  toggleShop(store) {
    if (this.shop) this.closeShop();
    else this.openShop(store);
  }

  openShop(store) {
    this.closeChest();
    this.shop = { store };
    this.render();
  }

  closeShop() {
    if (!this.shop) return;
    this.shop = null;
    this.render();
  }

  sell(type, n) {
    const def = this.shop.store.def;
    const price = def.buys[type];
    const sold = this.bag.remove(type, n);
    if (!sold) return;
    this.wallet.add(sold * price);
    this.toast(`Sold ${sold} ${ITEMS[type].name} for ${formatCoins(sold * price)}`);
  }

  buy({ type, price }) {
    if (!this.wallet.canAfford(price)) return this.toast('Not enough coins', 'error');
    if (this.bag.spaceFor(type) < 1) return this.toast('Your bag is full', 'error');
    this.wallet.spend(price);
    this.bag.add(makeItem(type));
    this.toast(`Bought ${ITEMS[type].name} for ${formatCoins(price)}`);
  }

  // ---- Rendering ----

  select(i) {
    this.player.selected = i;
    this.render();
  }

  render() {
    // Bag bar (hidden while the chest panel is open: the panel shows the bag too)
    const bar = this.slotEls(this.bag, (i) => this.select(i), true);
    bar[this.player.selected]?.classList.add('selected');
    this.hotbar.replaceChildren(...bar);
    this.hotbar.classList.toggle('hidden', this.chestOpen);
    this.purse.replaceChildren(coinsEl(this.wallet.total, true));
    this.purse.title = formatCoins(this.wallet.total);

    if (this.chest) this.renderChest();
    else if (this.shop) this.renderShop();
    else this.panel.classList.add('hidden');
  }

  renderChest() {
    const chestInv = this.chest.inventory;
    this.panel.className = 'panel';
    this.panel.replaceChildren(
      el('div', 'panel-title', 'Chest'),
      row(this.slotEls(chestInv, (i) => this.move(chestInv, i, this.bag, 'Your bag is full'))),
      el('div', 'panel-title', 'Your bag'),
      row(this.slotEls(this.bag, (i) => this.move(this.bag, i, chestInv, 'The chest is full'))),
      el('div', 'panel-hint', 'Click an item to move it  ·  Esc to close'),
      closeButton(() => this.closeChest()),
    );
  }

  renderShop() {
    const def = this.shop.store.def;
    this.panel.className = 'panel shop';

    const greeting = el('div', 'shop-greeting');
    greeting.append(el('b', '', `${def.merchant}: `), `“${def.greeting}”`);

    // What the merchant buys from you
    const sellRows = Object.entries(def.buys).map(([type, price]) => {
      const have = this.bag.count(type);
      return shopRow(type, price, 'each', `You have ${have}`, [
        button('Sell 1', have < 1, () => this.sell(type, 1)),
        button('Sell all', have < 1, () => this.sell(type, have)),
      ]);
    });

    // What the merchant sells to you
    const buyRows = def.sells.length
      ? def.sells.map((entry) =>
          shopRow(entry.type, entry.price, '', ITEMS[entry.type].description, [
            button('Buy', !this.wallet.canAfford(entry.price), () => this.buy(entry)),
          ]))
      : [el('div', 'shop-empty', 'Nothing for sale right now.')];

    const footer = el('div', 'shop-footer');
    footer.append('Your coins: ', coinsEl(this.wallet.total, true));

    this.panel.replaceChildren(
      el('div', 'panel-title shop-title', def.name),
      greeting,
      el('div', 'panel-title', `${def.merchant} buys`),
      ...sellRows,
      el('div', 'panel-title', `${def.merchant} sells`),
      ...buyRows,
      footer,
      el('div', 'panel-hint', 'Esc to close'),
      closeButton(() => this.closeShop()),
    );
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
        slot.appendChild(icon(item.type));
        if (item.count > 1) slot.appendChild(el('span', 'slot-count', String(item.count)));
        slot.title = `${def.name}${item.count > 1 ? ` ×${item.count}` : ''}\n${def.description}`;
      }
      // Bag bar: any slot can be selected. Chest panel: only filled slots do something.
      if (onClick && (item || numbered)) slot.addEventListener('click', () => onClick(i));
      return slot;
    });
  }

  /** Briefly show the "Saved" indicator. */
  flashSaved() {
    this.savedEl.classList.add('show');
    clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => this.savedEl.classList.remove('show'), 1200);
  }

  /** kind: 'info' | 'error' */
  toast(msg, kind = 'info') {
    this.toastEl.textContent = msg;
    this.toastEl.className = `toast ${kind}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), 2600);
  }
}

// ---- Little DOM builders ----

function icon(type) {
  const img = el('img');
  img.src = iconUrl(type);
  img.alt = ITEMS[type].name;
  return img;
}

/** Coin amount as e.g. [12 (gold coin)] [3 (silver coin)] [450 (bronze coin)]. */
function coinsEl(total, showZeros = false) {
  const parts = splitCoins(total);
  const wrap = el('span', 'coins');
  for (const c of COINS) {
    if (!showZeros && parts[c.key] === 0) continue;
    const amt = el('span', 'coin-amt', String(parts[c.key]));
    const coin = el('i', `coin ${c.key}`);
    coin.title = c.name;
    amt.appendChild(coin);
    wrap.appendChild(amt);
  }
  if (!wrap.children.length) {
    const zero = el('span', 'coin-amt', '0');
    zero.appendChild(el('i', 'coin bronze'));
    wrap.appendChild(zero);
  }
  return wrap;
}

function shopRow(type, price, priceSuffix, detail, buttons) {
  const r = el('div', 'shop-row');
  const iconBox = el('div', 'slot filled');
  iconBox.appendChild(icon(type));
  const info = el('div', 'shop-info');
  info.append(el('div', 'shop-name', ITEMS[type].name), el('div', 'shop-detail', detail));
  const priceEl = el('div', 'shop-price');
  priceEl.append(coinsEl(price));
  if (priceSuffix) priceEl.append(el('span', 'shop-each', priceSuffix));
  const actions = el('div', 'shop-actions');
  actions.append(...buttons);
  r.append(iconBox, info, priceEl, actions);
  return r;
}

function button(label, disabled, onClick) {
  const b = el('button', 'btn', label);
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
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
