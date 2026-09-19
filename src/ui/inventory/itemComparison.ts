import { aggregateStats, type CoreStats, type StatModifier } from '../../domain/stats/stats.js';

export type StatDeltas = Partial<Record<keyof CoreStats, number>>;

export function compareModifierSets(
  base: CoreStats,
  currentModifiers: readonly StatModifier[],
  candidateModifiers: readonly StatModifier[],
): StatDeltas {
  const current = aggregateStats(base, currentModifiers);
  const candidate = aggregateStats(base, candidateModifiers);
  const result: StatDeltas = {};
  (Object.keys(base) as Array<keyof CoreStats>).forEach((key) => {
    const delta = candidate[key] - current[key];
    if (Math.abs(delta) > 1e-9) result[key] = delta;
  });
  return result;
}
