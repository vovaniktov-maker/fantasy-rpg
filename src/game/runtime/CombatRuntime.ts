import { resolveDamage, type RandomRoll } from '../../domain/combat/damage.js';
import type {
  AttackWindowDefinition,
  CombatHitResult,
  RuntimeCombatTarget,
} from './runtimeTypes.js';

interface ActiveAttack {
  definition: AttackWindowDefinition;
  hitTargetIds: Set<string>;
}

export class CombatRuntime {
  private readonly attacks = new Map<string, ActiveAttack>();
  private sequence = 0;

  constructor(private readonly roll: RandomRoll) {}

  beginAttack(definition: AttackWindowDefinition): string {
    const id = `attack-${++this.sequence}`;
    this.attacks.set(id, {
      definition: { ...definition },
      hitTargetIds: new Set(),
    });
    return id;
  }

  tryHit(attackId: string, target: RuntimeCombatTarget): CombatHitResult {
    const attack = this.attacks.get(attackId);
    if (!attack || attack.definition.ownerId === target.id || attack.hitTargetIds.has(target.id)) {
      return { applied: false, finalDamage: 0, critical: false };
    }
    if (target.isInvulnerable() || target.getHp() <= 0) {
      return { applied: false, finalDamage: 0, critical: false };
    }

    const result = resolveDamage({
      rawDamage: attack.definition.rawDamage,
      critChance: attack.definition.critChance,
      critDamage: attack.definition.critDamage,
      targetArmor: target.getArmor(),
    }, this.roll);

    target.applyDamage(result.finalDamage);
    attack.hitTargetIds.add(target.id);
    return { applied: true, finalDamage: result.finalDamage, critical: result.critical };
  }

  endAttack(attackId: string): void {
    this.attacks.delete(attackId);
  }

  hasAttack(attackId: string): boolean {
    return this.attacks.has(attackId);
  }
}
