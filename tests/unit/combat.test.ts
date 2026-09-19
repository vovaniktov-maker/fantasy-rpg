import { describe, expect, it } from 'vitest';
import { resolveDamage } from '../../src/domain/combat/damage';

describe('resolveDamage', () => {
  it('applies crit and armor deterministically', () => {
    const result = resolveDamage({ rawDamage: 100, critChance: 1, critDamage: 2, targetArmor: 20 }, () => 0);
    expect(result.critical).toBe(true);
    expect(result.finalDamage).toBe(167);
  });
});
