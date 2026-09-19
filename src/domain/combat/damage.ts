export interface DamageInput {
  rawDamage: number;
  critChance: number;
  critDamage: number;
  targetArmor: number;
}

export interface DamageResult {
  finalDamage: number;
  critical: boolean;
}

export type RandomRoll = () => number;

export function resolveDamage(input: DamageInput, roll: RandomRoll): DamageResult {
  const raw = Math.max(0, input.rawDamage);
  const armor = Math.max(0, input.targetArmor);
  const mitigated = raw * (100 / (100 + armor));
  const critical = roll() < Math.max(0, Math.min(1, input.critChance));
  const multiplier = critical ? Math.max(1, input.critDamage) : 1;
  return { finalDamage: Math.max(1, Math.round(mitigated * multiplier)), critical };
}
