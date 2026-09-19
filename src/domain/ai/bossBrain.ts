import type { RandomSource } from '../items/itemGenerator.js';
import { rollLoot } from '../loot/lootTables.js';
import { advanceQuest, type QuestState } from '../quests/questState.js';
import { lootTableDefinitions } from '../../content/lootTables.js';

export type BossPhase = 'phase1' | 'phase2' | 'finalPressure';

export interface BossMoveDefinition {
  id: string;
  damage: number;
  telegraphMs: number;
  activeMs: number;
  recoveryMs: number;
  punishWindowMs: number;
  cueKey: string;
}

export interface BossBrainState { sequence: number; }
export interface BossObservation { hpRatio: number; distance: number; actionReady: boolean; }
export interface BossIntent { type: 'wait' | 'prepareMove'; moveId: string; telegraphMs: number; cueKey: string; }
export interface BossBrainResult { phase: BossPhase; intent: BossIntent; nextState: BossBrainState; }

const phase1Moves: BossMoveDefinition[] = [
  { id: 'fast_combo', damage: 18, telegraphMs: 260, activeMs: 320, recoveryMs: 520, punishWindowMs: 420, cueKey: 'leader-blade-glint' },
  { id: 'thrown_knives', damage: 12, telegraphMs: 420, activeMs: 180, recoveryMs: 500, punishWindowMs: 350, cueKey: 'leader-knife-fan' },
  { id: 'poison_strike', damage: 15, telegraphMs: 360, activeMs: 140, recoveryMs: 560, punishWindowMs: 450, cueKey: 'leader-green-blade' },
  { id: 'smoke_reposition', damage: 0, telegraphMs: 300, activeMs: 220, recoveryMs: 420, punishWindowMs: 0, cueKey: 'leader-smoke' },
  { id: 'side_dodge', damage: 0, telegraphMs: 120, activeMs: 180, recoveryMs: 300, punishWindowMs: 0, cueKey: 'leader-step' },
];

const phase2Extra: BossMoveDefinition[] = [
  { id: 'feint_cut', damage: 20, telegraphMs: 480, activeMs: 170, recoveryMs: 500, punishWindowMs: 450, cueKey: 'leader-feint' },
  { id: 'dash_behind', damage: 17, telegraphMs: 320, activeMs: 220, recoveryMs: 480, punishWindowMs: 400, cueKey: 'leader-dash' },
  { id: 'long_string', damage: 28, telegraphMs: 340, activeMs: 620, recoveryMs: 720, punishWindowMs: 620, cueKey: 'leader-long-string' },
];

const finalExtra: BossMoveDefinition[] = [
  { id: 'final_flurry', damage: 34, telegraphMs: 300, activeMs: 720, recoveryMs: 760, punishWindowMs: 700, cueKey: 'leader-final-flurry' },
  { id: 'smoke_dash_chain', damage: 22, telegraphMs: 360, activeMs: 500, recoveryMs: 540, punishWindowMs: 500, cueKey: 'leader-smoke-chain' },
];

export function getBossPhase(hpRatio: number): BossPhase {
  if (hpRatio >= 0.6) return 'phase1';
  if (hpRatio >= 0.25) return 'phase2';
  return 'finalPressure';
}

export function getBanditLeaderMovePool(phase: BossPhase): BossMoveDefinition[] {
  if (phase === 'phase1') return phase1Moves.map((move) => ({ ...move }));
  if (phase === 'phase2') return [...phase1Moves, ...phase2Extra].map((move) => ({ ...move }));
  return [...phase1Moves.filter((move) => move.id !== 'side_dodge'), ...phase2Extra, ...finalExtra]
    .map((move) => move.damage > 0 ? { ...move, recoveryMs: Math.max(380, Math.round(move.recoveryMs * 0.85)) } : { ...move });
}

export function stepBanditLeaderBrain(state: BossBrainState, observation: BossObservation): BossBrainResult {
  const phase = getBossPhase(observation.hpRatio);
  const pool = getBanditLeaderMovePool(phase);
  if (!observation.actionReady) {
    return { phase, intent: { type: 'wait', moveId: '', telegraphMs: 0, cueKey: '' }, nextState: state };
  }
  const move = pool[state.sequence % pool.length];
  return {
    phase,
    intent: { type: 'prepareMove', moveId: move.id, telegraphMs: move.telegraphMs, cueKey: move.cueKey },
    nextState: { sequence: state.sequence + 1 },
  };
}

export function resolveBanditLeaderVictory(quest: QuestState, alreadyResolved: boolean, rng: RandomSource): {
  resolved: boolean;
  quest: QuestState;
  lootId: string | null;
  exitUnlocked: boolean;
} {
  if (alreadyResolved) return { resolved: false, quest, lootId: null, exitUnlocked: true };
  const table = lootTableDefinitions.find((entry) => entry.id === 'bandit_leader');
  const lootId = table ? (rollLoot(table.entries, 1, rng) ?? 'steel_dagger') : 'steel_dagger';
  return { resolved: true, quest: advanceQuest(quest, 'leaderDefeated'), lootId, exitUnlocked: true };
}
