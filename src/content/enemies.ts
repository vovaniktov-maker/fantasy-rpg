export interface EnemyAttackDefinition {
  id: string;
  range: number;
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
  cueKey: string;
  damage: number;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  archetype: 'melee' | 'cutthroat' | 'archer' | 'heavy' | 'trapper';
  preferredRange: number;
  flankBias: number;
  retreatThreshold: number;
  moveSpeed: number;
  armor: number;
  attacks: EnemyAttackDefinition[];
}

export const enemyDefinitions: EnemyDefinition[] = [
  { id: 'bandit_melee', name: 'Bandit Guard', archetype: 'melee', preferredRange: 55, flankBias: 0.1, retreatThreshold: 0, moveSpeed: 130, armor: 5, attacks: [{ id: 'slash', range: 70, telegraphMs: 300, activeMs: 120, recoveryMs: 420, cueKey: 'slash-ready', damage: 12 }] },
  { id: 'bandit_cutthroat', name: 'Cutthroat', archetype: 'cutthroat', preferredRange: 45, flankBias: 0.8, retreatThreshold: 0.15, moveSpeed: 175, armor: 2, attacks: [{ id: 'double_cut', range: 65, telegraphMs: 220, activeMs: 180, recoveryMs: 360, cueKey: 'knife-glint', damage: 10 }] },
  { id: 'bandit_archer', name: 'Bandit Archer', archetype: 'archer', preferredRange: 280, flankBias: 0.25, retreatThreshold: 0.35, moveSpeed: 120, armor: 1, attacks: [{ id: 'aimed_shot', range: 420, telegraphMs: 550, activeMs: 80, recoveryMs: 600, cueKey: 'bow-draw', damage: 14 }] },
  { id: 'bandit_heavy', name: 'Bandit Enforcer', archetype: 'heavy', preferredRange: 65, flankBias: 0, retreatThreshold: 0, moveSpeed: 85, armor: 18, attacks: [{ id: 'overhead', range: 85, telegraphMs: 650, activeMs: 160, recoveryMs: 700, cueKey: 'heavy-windup', damage: 24 }] },
  { id: 'bandit_trapper', name: 'Bandit Trapper', archetype: 'trapper', preferredRange: 220, flankBias: 0.4, retreatThreshold: 0.45, moveSpeed: 140, armor: 2, attacks: [{ id: 'trap_throw', range: 300, telegraphMs: 450, activeMs: 100, recoveryMs: 800, cueKey: 'trap-rattle', damage: 9 }] },
];

export const banditLeaderRuntimeDefinition = {
  id: 'bandit_leader',
  name: 'Bandit Leader',
  maxHp: 600,
  armor: 8,
  moveSpeed: 170,
  note: 'Phase transitions change move selection/cadence only; HP and armor do not inflate.',
} as const;
