import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateStats } from '../../src/domain/stats/stats.js';
import { resolveDamage } from '../../src/domain/combat/damage.js';

const base = { hp: 100, energy: 100, attackPower: 10, critChance: 0.1, critDamage: 1.5, armor: 5, moveSpeed: 180, attackSpeed: 1, cooldownReduction: 0, dodgeDistance: 120 };

test('aggregates flat and rate modifiers with clamps', () => {
  assert.equal(aggregateStats(base, [{ stat: 'attackPower', mode: 'flat', value: 5 }]).attackPower, 15);
  assert.ok(Math.abs(aggregateStats(base, [{ stat: 'critChance', mode: 'addPercent', value: 0.2 }]).critChance - 0.3) < 1e-9);
  assert.equal(aggregateStats(base, [{ stat: 'critChance', mode: 'addPercent', value: 2 }]).critChance, 1);
  assert.equal(aggregateStats(base, [{ stat: 'cooldownReduction', mode: 'addPercent', value: 2 }]).cooldownReduction, 0.75);
});

test('resolves crit and armor deterministically', () => {
  const result = resolveDamage({ rawDamage: 100, critChance: 1, critDamage: 2, targetArmor: 20 }, () => 0);
  assert.equal(result.critical, true);
  assert.ok(result.finalDamage > 0 && result.finalDamage < 200);
  assert.equal(result.finalDamage, 167);
});
