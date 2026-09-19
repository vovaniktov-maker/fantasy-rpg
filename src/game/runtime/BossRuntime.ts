import { banditLeaderRuntimeDefinition } from '../../content/enemies.js';
import {
  getBanditLeaderMovePool,
  getBossPhase,
  stepBanditLeaderBrain,
  type BossBrainState,
  type BossMoveDefinition,
  type BossPhase,
} from '../../domain/ai/bossBrain.js';
import { CombatRuntime } from './CombatRuntime.js';
import type { RuntimeCombatTarget } from './runtimeTypes.js';

export interface BossRuntimeConfig {
  combat: CombatRuntime;
  id?: string;
  maxHp?: number;
  armor?: number;
  timingMultiplier?: number;
}

export interface BossRuntimeObservation {
  distance: number;
}

export interface BossRuntimeFrame {
  phase: BossPhase;
  telegraph?: { moveId: string; telegraphMs: number; cueKey: string };
  attackWindowId?: string;
  recovering: boolean;
}

export interface BossRuntimeSnapshot {
  id: string;
  hp: number;
  maxHp: number;
  armor: number;
  phase: BossPhase;
}

type ActionState =
  | { mode: 'idle' }
  | { mode: 'telegraph'; move: BossMoveDefinition; remainingMs: number }
  | { mode: 'active'; move: BossMoveDefinition; remainingMs: number; attackWindowId?: string }
  | { mode: 'recovery'; move: BossMoveDefinition; remainingMs: number };

export class BossRuntime {
  private readonly id: string;
  private readonly maxHp: number;
  private readonly armor: number;
  private readonly timingMultiplier: number;
  private hp: number;
  private brain: BossBrainState = { sequence: 0 };
  private action: ActionState = { mode: 'idle' };
  private victoryPending = false;
  private victoryConsumed = false;

  constructor(private readonly config: BossRuntimeConfig) {
    this.id = config.id ?? banditLeaderRuntimeDefinition.id;
    this.maxHp = Math.max(1, Math.round(config.maxHp ?? banditLeaderRuntimeDefinition.maxHp));
    this.armor = Math.max(0, config.armor ?? banditLeaderRuntimeDefinition.armor);
    this.hp = this.maxHp;
    this.timingMultiplier = Math.max(0.05, config.timingMultiplier ?? 1);
  }

  update(observation: BossRuntimeObservation, dtMs: number): BossRuntimeFrame {
    const dt = Math.max(0, dtMs);
    const phase = getBossPhase(this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.endActiveAttack();
      return { phase, recovering: false };
    }

    if (this.action.mode === 'idle') {
      const result = stepBanditLeaderBrain(this.brain, {
        hpRatio: this.hp / this.maxHp,
        distance: observation.distance,
        actionReady: true,
      });
      this.brain = result.nextState;
      const move = getBanditLeaderMovePool(result.phase).find((candidate) => candidate.id === result.intent.moveId);
      if (!move) return { phase, recovering: false };
      this.action = {
        mode: 'telegraph',
        move,
        remainingMs: move.telegraphMs * this.timingMultiplier,
      };
      return {
        phase,
        telegraph: {
          moveId: move.id,
          telegraphMs: move.telegraphMs * this.timingMultiplier,
          cueKey: move.cueKey,
        },
        recovering: false,
      };
    }

    if (this.action.mode === 'telegraph') {
      const remainingMs = this.action.remainingMs - dt;
      if (remainingMs > 0) {
        this.action = { ...this.action, remainingMs };
        return {
          phase,
          telegraph: {
            moveId: this.action.move.id,
            telegraphMs: Math.max(0, remainingMs),
            cueKey: this.action.move.cueKey,
          },
          recovering: false,
        };
      }
      const move = this.action.move;
      const attackWindowId = move.damage > 0
        ? this.config.combat.beginAttack({
            ownerId: this.id,
            rawDamage: move.damage,
            critChance: 0,
            critDamage: 1,
          })
        : undefined;
      this.action = {
        mode: 'active',
        move,
        remainingMs: move.activeMs * this.timingMultiplier,
        attackWindowId,
      };
      return { phase, attackWindowId, recovering: false };
    }

    if (this.action.mode === 'active') {
      const remainingMs = this.action.remainingMs - dt;
      if (remainingMs > 0) {
        this.action = { ...this.action, remainingMs };
        return { phase, attackWindowId: this.action.attackWindowId, recovering: false };
      }
      const move = this.action.move;
      this.endActiveAttack();
      this.action = {
        mode: 'recovery',
        move,
        remainingMs: move.recoveryMs * this.timingMultiplier,
      };
      return { phase, recovering: true };
    }

    const remainingMs = this.action.remainingMs - dt;
    if (remainingMs > 0) {
      this.action = { ...this.action, remainingMs };
      return { phase, recovering: true };
    }
    this.action = { mode: 'idle' };
    return { phase, recovering: false };
  }

  setHp(hp: number): void {
    const before = this.hp;
    this.hp = Math.max(0, Math.min(this.maxHp, hp));
    if (before > 0 && this.hp <= 0 && !this.victoryConsumed) {
      this.victoryPending = true;
      this.endActiveAttack();
    }
  }

  get snapshot(): BossRuntimeSnapshot {
    return {
      id: this.id,
      hp: this.hp,
      maxHp: this.maxHp,
      armor: this.armor,
      phase: getBossPhase(this.hp / this.maxHp),
    };
  }

  getCombatTarget(): RuntimeCombatTarget {
    return {
      id: this.id,
      getHp: () => this.hp,
      getArmor: () => this.armor,
      isInvulnerable: () => false,
      applyDamage: (amount) => this.setHp(this.hp - Math.max(0, amount)),
    };
  }

  consumeVictory(): { resolved: boolean } {
    if (!this.victoryPending || this.victoryConsumed) return { resolved: false };
    this.victoryPending = false;
    this.victoryConsumed = true;
    return { resolved: true };
  }

  private endActiveAttack(): void {
    if (this.action.mode === 'active' && this.action.attackWindowId) {
      this.config.combat.endAttack(this.action.attackWindowId);
    }
  }
}
