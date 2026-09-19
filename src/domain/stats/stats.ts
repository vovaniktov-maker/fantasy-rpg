export interface CoreStats {
  hp: number;
  energy: number;
  attackPower: number;
  critChance: number;
  critDamage: number;
  armor: number;
  moveSpeed: number;
  attackSpeed: number;
  cooldownReduction: number;
  dodgeDistance: number;
}

export type StatKey = keyof CoreStats;
export type ModifierMode = 'flat' | 'addPercent';

export interface StatModifier {
  stat: StatKey;
  mode: ModifierMode;
  value: number;
}

const RATE_STATS = new Set<StatKey>(['critChance', 'cooldownReduction']);

export function aggregateStats(base: CoreStats, modifiers: readonly StatModifier[]): CoreStats {
  const result: CoreStats = { ...base };
  for (const modifier of modifiers) {
    if (modifier.mode === 'flat') result[modifier.stat] += modifier.value;
  }
  for (const modifier of modifiers) {
    if (modifier.mode !== 'addPercent') continue;
    if (RATE_STATS.has(modifier.stat)) result[modifier.stat] += modifier.value;
    else result[modifier.stat] *= 1 + modifier.value;
  }
  result.critChance = Math.max(0, Math.min(1, result.critChance));
  result.cooldownReduction = Math.max(0, Math.min(0.75, result.cooldownReduction));
  result.hp = Math.max(1, result.hp);
  result.energy = Math.max(0, result.energy);
  return result;
}
