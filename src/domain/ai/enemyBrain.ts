import type { EnemyDefinition } from '../../content/enemies.js';

export type EnemyBrainStateName = 'idle' | 'suspicious' | 'chase' | 'position' | 'prepareAttack' | 'attack' | 'recover' | 'retreat' | 'disabled' | 'dead';

export interface EnemyBrainState {
  state: EnemyBrainStateName;
  stateElapsedMs: number;
  selectedAttackId?: string;
}

export interface EnemyObservation {
  playerVisible: boolean;
  distance: number;
  attackReady: boolean;
  hpRatio: number;
}

export type EnemyIntent =
  | { type: 'idle' }
  | { type: 'moveToward'; preferredRange: number }
  | { type: 'moveAway'; preferredRange: number }
  | { type: 'strafe'; bias: number }
  | { type: 'prepareAttack'; attackId: string; telegraphMs: number; cueKey: string }
  | { type: 'attack'; attackId: string }
  | { type: 'recover'; recoveryMs: number };

export interface EnemyBrainStep {
  state: EnemyBrainStateName;
  intent: EnemyIntent;
  selectedAttackId?: string;
}

function chooseAttack(definition: EnemyDefinition, distance: number) {
  return definition.attacks.find((attack) => distance <= attack.range) ?? definition.attacks[0];
}

export function stepEnemyBrain(
  current: EnemyBrainState,
  observation: EnemyObservation,
  definition: EnemyDefinition,
): EnemyBrainStep {
  if (current.state === 'dead') return { state: 'dead', intent: { type: 'idle' } };
  if (current.state === 'disabled') return { state: 'disabled', intent: { type: 'idle' } };

  if (!observation.playerVisible) {
    return { state: current.state === 'idle' ? 'idle' : 'suspicious', intent: { type: 'idle' } };
  }

  if (definition.retreatThreshold > 0 && observation.hpRatio <= definition.retreatThreshold && observation.distance < definition.preferredRange * 0.75) {
    return { state: 'retreat', intent: { type: 'moveAway', preferredRange: definition.preferredRange } };
  }

  const selected = definition.attacks.find((attack) => attack.id === current.selectedAttackId) ?? chooseAttack(definition, observation.distance);

  switch (current.state) {
    case 'prepareAttack':
      if (current.stateElapsedMs >= selected.telegraphMs) return { state: 'attack', selectedAttackId: selected.id, intent: { type: 'attack', attackId: selected.id } };
      return { state: 'prepareAttack', selectedAttackId: selected.id, intent: { type: 'prepareAttack', attackId: selected.id, telegraphMs: selected.telegraphMs, cueKey: selected.cueKey } };
    case 'attack':
      if (current.stateElapsedMs >= selected.activeMs) return { state: 'recover', selectedAttackId: selected.id, intent: { type: 'recover', recoveryMs: selected.recoveryMs } };
      return { state: 'attack', selectedAttackId: selected.id, intent: { type: 'attack', attackId: selected.id } };
    case 'recover':
      if (current.stateElapsedMs >= selected.recoveryMs) return { state: 'position', intent: { type: 'strafe', bias: definition.flankBias } };
      return { state: 'recover', selectedAttackId: selected.id, intent: { type: 'recover', recoveryMs: selected.recoveryMs } };
    default:
      break;
  }

  if (observation.distance <= selected.range && observation.attackReady) {
    return { state: 'prepareAttack', selectedAttackId: selected.id, intent: { type: 'prepareAttack', attackId: selected.id, telegraphMs: selected.telegraphMs, cueKey: selected.cueKey } };
  }
  if (observation.distance > definition.preferredRange * 1.15) {
    return { state: 'chase', intent: { type: 'moveToward', preferredRange: definition.preferredRange } };
  }
  if (observation.distance < definition.preferredRange * 0.65 && definition.preferredRange > selected.range) {
    return { state: 'retreat', intent: { type: 'moveAway', preferredRange: definition.preferredRange } };
  }
  return { state: 'position', intent: { type: 'strafe', bias: definition.flankBias } };
}
