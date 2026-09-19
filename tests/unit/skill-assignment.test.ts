import { describe, expect, it } from 'vitest';
import { rogueSkillNodes } from '../../src/content/skills';
import { assignActiveSkill } from '../../src/domain/skills/skillTree';

describe('active skill assignment', () => {
  it('assigns only a learned active skill to slots 0 through 3', () => {
    const state = { learned: { assassin_shadow_dash: 1 } };
    const result = assignActiveSkill(rogueSkillNodes, state, [null, null, null, null], 'shadow_dash', 0);
    expect(result.assigned).toBe(true);
    expect(result.slots[0]).toBe('shadow_dash');
  });

  it('rejects passive ids, unknown ids, duplicates, and invalid slot indexes', () => {
    const state = { learned: { assassin_precision: 1, assassin_shadow_dash: 1 } };
    expect(assignActiveSkill(rogueSkillNodes, state, [null, null, null, null], 'assassin_precision', 0).assigned).toBe(false);
    expect(assignActiveSkill(rogueSkillNodes, state, ['shadow_dash', null, null, null], 'shadow_dash', 1).assigned).toBe(false);
    expect(assignActiveSkill(rogueSkillNodes, state, [null, null, null, null], 'shadow_dash', 9).assigned).toBe(false);
  });
});
