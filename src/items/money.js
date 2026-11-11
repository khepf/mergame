// Coins. Everything is counted internally in bronze:
//   1 gold = 1000 silver, 1 silver = 1000 bronze  ->  1 gold = 1,000,000 bronze.
export const BRONZE_PER_SILVER = 1000;
export const SILVER_PER_GOLD = 1000;
export const BRONZE_PER_GOLD = BRONZE_PER_SILVER * SILVER_PER_GOLD;

export const COINS = [
  { key: 'gold', name: 'gold', value: BRONZE_PER_GOLD },
  { key: 'silver', name: 'silver', value: BRONZE_PER_SILVER },
  { key: 'bronze', name: 'bronze', value: 1 },
];

/** 1,002,003 bronze -> { gold: 1, silver: 2, bronze: 3 } */
export function splitCoins(total) {
  return {
    gold: Math.floor(total / BRONZE_PER_GOLD),
    silver: Math.floor(total / BRONZE_PER_SILVER) % SILVER_PER_GOLD,
    bronze: total % BRONZE_PER_SILVER,
  };
}

/** Human-readable amount, e.g. "1 gold, 2 silver, 3 bronze" (zeros skipped). */
export function formatCoins(total) {
  const parts = splitCoins(total);
  const text = COINS.filter((c) => parts[c.key] > 0).map((c) => `${parts[c.key]} ${c.name}`);
  return text.length ? text.join(', ') : '0 bronze';
}

export class Wallet {
  constructor(bronze = 0) {
    this.total = bronze; // in bronze
    this.listeners = new Set();
  }

  canAfford(cost) {
    return this.total >= cost;
  }

  add(amount) {
    this.total += amount;
    this.emit();
  }

  /** Returns false (and spends nothing) if there isn't enough. */
  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.total -= amount;
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
