export interface ProgressionState {
  level: number;
  xp: number;
  unspentSkillPoints: number;
}

export function xpForNextLevel(level: number): number {
  const normalized = Math.max(1, Math.floor(level));
  return 100 + (normalized - 1) * 100;
}

export function grantXp(state: ProgressionState, amount: number): ProgressionState {
  let level = Math.max(1, Math.floor(state.level));
  let xp = Math.max(0, state.xp) + Math.max(0, amount);
  let unspentSkillPoints = Math.max(0, Math.floor(state.unspentSkillPoints));
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level += 1;
    unspentSkillPoints += 1;
  }
  return { level, xp, unspentSkillPoints };
}
