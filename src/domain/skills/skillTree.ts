import type { StatModifier } from '../stats/stats.js';

export type RogueBranch = 'assassin' | 'duelist' | 'poisoner';
export type SkillNodeKind = 'passive' | 'active' | 'keystone';

export interface SkillNodeDefinition {
  id: string;
  branch: RogueBranch;
  kind: SkillNodeKind;
  prerequisites: string[];
  maxRank: number;
  modifiers?: StatModifier[];
  activeSkillId?: string;
}

export interface SkillTreeState {
  learned: Record<string, number>;
}

function byId(definitions: readonly SkillNodeDefinition[]): Map<string, SkillNodeDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

export function spentSkillPoints(state: SkillTreeState): number {
  return Object.values(state.learned).reduce((sum, rank) => sum + Math.max(0, Math.floor(rank)), 0);
}

export function canUnlockSkill(
  definitions: readonly SkillNodeDefinition[],
  state: SkillTreeState,
  skillId: string,
  availablePoints: number,
): boolean {
  if (availablePoints < 1) return false;
  const definition = byId(definitions).get(skillId);
  if (!definition) return false;
  const rank = state.learned[skillId] ?? 0;
  if (rank >= definition.maxRank) return false;
  return definition.prerequisites.every((id) => (state.learned[id] ?? 0) > 0);
}

export function unlockSkill(
  definitions: readonly SkillNodeDefinition[],
  state: SkillTreeState,
  skillId: string,
  availablePoints: number,
): { unlocked: boolean; state: SkillTreeState; pointsRemaining: number } {
  if (!canUnlockSkill(definitions, state, skillId, availablePoints)) {
    return { unlocked: false, state, pointsRemaining: availablePoints };
  }
  const next: SkillTreeState = { learned: { ...state.learned, [skillId]: (state.learned[skillId] ?? 0) + 1 } };
  return { unlocked: true, state: next, pointsRemaining: availablePoints - 1 };
}

export function calculateRespecCost(state: SkillTreeState, level: number): number {
  return 100 + spentSkillPoints(state) * 50 + Math.max(0, Math.floor(level) - 1) * 25;
}

export function respecSkills(
  state: SkillTreeState,
  gold: number,
  level: number,
): { success: boolean; state: SkillTreeState; gold: number; refundedPoints: number; cost: number } {
  const cost = calculateRespecCost(state, level);
  const refundedPoints = spentSkillPoints(state);
  if (gold < cost) return { success: false, state, gold, refundedPoints: 0, cost };
  return { success: true, state: { learned: {} }, gold: gold - cost, refundedPoints, cost };
}
