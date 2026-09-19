import { describe, expect, it } from 'vitest';
import { aggregateStats, type CoreStats } from '../../src/domain/stats/stats';

const base: CoreStats = { hp: 100, energy: 100, attackPower: 10, critChance: 0.1, critDamage: 1.5, armor: 5, moveSpeed: 180, attackSpeed: 1, cooldownReduction: 0, dodgeDistance: 120 };

describe('aggregateStats', () => {
  it('applies flat and percent/rate modifiers with clamps', () => {
    expect(aggregateStats(base, [{ stat: 'attackPower', mode: 'flat', value: 5 }]).attackPower).toBe(15);
    expect(aggregateStats(base, [{ stat: 'critChance', mode: 'addPercent', value: 0.2 }]).critChance).toBeCloseTo(0.3);
    expect(aggregateStats(base, [{ stat: 'cooldownReduction', mode: 'addPercent', value: 2 }]).cooldownReduction).toBe(0.75);
  });
});
