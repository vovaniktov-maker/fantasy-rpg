import type { EnemyDefinition } from '../../content/enemies.js';
import { stepEnemyBrain, type EnemyBrainState, type EnemyObservation, type EnemyIntent } from '../../domain/ai/enemyBrain.js';

export class EnemyController {
  private brain: EnemyBrainState = { state: 'idle', stateElapsedMs: 0 };

  constructor(private readonly definition: EnemyDefinition) {}

  step(observation: EnemyObservation, dtMs: number): EnemyIntent {
    const result = stepEnemyBrain(this.brain, observation, this.definition);
    const sameState = result.state === this.brain.state && result.selectedAttackId === this.brain.selectedAttackId;
    this.brain = {
      state: result.state,
      selectedAttackId: result.selectedAttackId,
      stateElapsedMs: sameState ? this.brain.stateElapsedMs + Math.max(0, dtMs) : 0,
    };
    return result.intent;
  }

  get state(): EnemyBrainState { return { ...this.brain }; }
}
