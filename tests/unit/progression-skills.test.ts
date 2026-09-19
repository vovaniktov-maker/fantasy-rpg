import { describe, expect, it } from 'vitest';
import { grantXp } from '../../src/domain/progression/leveling';
import { calculateRespecCost, canUnlockSkill, respecSkills, unlockSkill } from '../../src/domain/skills/skillTree';
import { rogueSkillNodes } from '../../src/content/skills';

describe('progression and Rogue skill tree', () => {
  it('grants one skill point per level gained', () => {
    const next = grantXp({ level: 1, xp: 0, unspentSkillPoints: 0 }, 250);
    expect(next.level).toBe(2);
    expect(next.unspentSkillPoints).toBe(1);
  });
  it('permits mixed branches without branch lock', () => {
    let state = { learned: {} as Record<string, number> };
    let points = 2;
    let result = unlockSkill(rogueSkillNodes, state, 'assassin_precision', points); state = result.state; points = result.pointsRemaining;
    expect(canUnlockSkill(rogueSkillNodes, state, 'poisoner_toxicology', points)).toBe(true);
  });
  it('requires enough gold to respec and refunds spent points', () => {
    const state = { learned: { assassin_precision: 1 } };
    const cost = calculateRespecCost(state, 2);
    expect(respecSkills(state, cost - 1, 2).success).toBe(false);
    expect(respecSkills(state, cost, 2).refundedPoints).toBe(1);
  });
});
