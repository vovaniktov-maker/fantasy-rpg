export interface RuntimeCombatTarget {
  id: string;
  getHp(): number;
  getArmor(): number;
  isInvulnerable(): boolean;
  applyDamage(amount: number): void;
}

export interface AttackWindowDefinition {
  ownerId: string;
  rawDamage: number;
  critChance: number;
  critDamage: number;
}

export interface CombatHitResult {
  applied: boolean;
  finalDamage: number;
  critical: boolean;
}
