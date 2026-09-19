import test from 'node:test';
import assert from 'node:assert/strict';
import { compareModifierSets } from '../../src/ui/inventory/itemComparison.js';

const base = { hp: 100, energy: 100, attackPower: 10, critChance: 0.1, critDamage: 1.5, armor: 5, moveSpeed: 180, attackSpeed: 1, cooldownReduction: 0, dodgeDistance: 120 };

test('item comparison derives deltas from the shared stat formula', () => {
  const deltas = compareModifierSets(base,
    [{ stat: 'attackPower', mode: 'flat', value: 2 }],
    [{ stat: 'attackPower', mode: 'flat', value: 7 }, { stat: 'critChance', mode: 'addPercent', value: 0.05 }],
  );
  assert.equal(deltas.attackPower, 5);
  assert.equal(typeof deltas.critChance, 'number');
  assert.ok(Math.abs((deltas.critChance ?? 0) - 0.05) < 1e-9);
});
