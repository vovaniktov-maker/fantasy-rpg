import type { RandomSource } from '../items/itemGenerator.js';

export interface LootTableEntry {
  id: string;
  weight: number;
  minLevel?: number;
  maxLevel?: number;
}

export function rollLoot(table: readonly LootTableEntry[], level: number, rng: RandomSource): string | null {
  const eligible = table.filter((entry) => entry.weight > 0 && (entry.minLevel === undefined || level >= entry.minLevel) && (entry.maxLevel === undefined || level <= entry.maxLevel));
  const total = eligible.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  let roll = Math.max(0, Math.min(0.999999999, rng.next())) * total;
  for (const entry of eligible) {
    if (roll < entry.weight) return entry.id;
    roll -= entry.weight;
  }
  return eligible.at(-1)?.id ?? null;
}
