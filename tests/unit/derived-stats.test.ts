import { describe, expect, it } from 'vitest';
import { buildContentRegistry } from '../../src/domain/content/contentRegistry';
import { createInitialGameState } from '../../src/domain/state/GameState';
import { deriveCombatStats, ROGUE_BASE_STATS } from '../../src/domain/stats/DerivedStatsService';

describe('derived combat stats', () => {
  it('combines equipped item and learned passive modifiers', () => {
    const state = createInitialGameState();
    state.inventory.slots[0] = {
      instanceId: 'steel-1',
      definitionId: 'steel_dagger',
      quantity: 1,
      itemLevel: 1,
      rarity: 'rare',
    };
    state.equipment.weapon = 'steel-1';
    state.skills.learned.assassin_precision = 1;

    const stats = deriveCombatStats(state, buildContentRegistry());
    expect(stats.attackPower).toBeGreaterThan(stats.base.attackPower);
    expect(stats.critChance).toBeCloseTo(stats.base.critChance + 0.03);
  });

  it('ignores stale equipped instance ids', () => {
    const state = createInitialGameState();
    state.equipment.weapon = 'missing';
    expect(() => deriveCombatStats(state, buildContentRegistry())).not.toThrow();
  });
  it('stale equipment and unknown skills never contribute derived stats', () => {
    const state = createInitialGameState();
    state.equipment.weapon = 'gone';
    state.skills.learned.removed_skill = 99;

    const stats = deriveCombatStats(state, buildContentRegistry());

    expect(stats.attackPower).toBe(ROGUE_BASE_STATS.attackPower);
    expect(stats.critChance).toBe(ROGUE_BASE_STATS.critChance);
    expect(stats.armor).toBe(ROGUE_BASE_STATS.armor);
  });
});
