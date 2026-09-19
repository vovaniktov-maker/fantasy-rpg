import type { RandomSource } from '../../domain/items/itemGenerator.js';

export function deriveRuntimeSeed(baseSeed: number, stream: string): number {
  let hash = (2166136261 ^ (baseSeed >>> 0)) >>> 0;
  for (let index = 0; index < stream.length; index += 1) {
    hash ^= stream.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash || 1;
}

export function createRuntimeRandom(seed: number): RandomSource {
  let state = seed >>> 0 || 1;
  return {
    next(): number {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('Cannot pick from an empty collection');
      const index = Math.min(items.length - 1, Math.floor(this.next() * items.length));
      return items[index];
    },
  };
}
