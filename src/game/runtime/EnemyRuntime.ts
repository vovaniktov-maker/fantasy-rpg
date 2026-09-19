import type { EnemyDefinition } from '../../content/enemies.js';
import type { EnemyObservation } from '../../domain/ai/enemyBrain.js';
import { EnemyActor } from '../enemies/EnemyActor.js';
import { EnemyController } from '../enemies/EnemyController.js';
import { CombatRuntime } from './CombatRuntime.js';
import type { RuntimeCombatTarget } from './runtimeTypes.js';

export interface EnemyRuntimeObservation extends EnemyObservation {
  directionToPlayer?: { x: number; y: number };
}

export interface EnemyRuntimeConfig {
  id: string;
  definition: EnemyDefinition;
  hp: number;
  position: { x: number; y: number };
  combat: CombatRuntime;
}

export interface EnemyRuntimeFrame {
  velocity: { x: number; y: number };
  telegraph?: { attackId: string; telegraphMs: number; cueKey: string };
  attackWindowId?: string;
  recovering: boolean;
}

function normalizedDirection(direction?: { x: number; y: number }): { x: number; y: number } {
  const source = direction ?? { x: 1, y: 0 };
  const length = Math.hypot(source.x, source.y);
  if (length <= 0.0001) return { x: 1, y: 0 };
  return { x: source.x / length, y: source.y / length };
}

export class EnemyRuntime {
  private readonly actor: EnemyActor;
  private readonly controller: EnemyController;
  private activeAttack?: { attackId: string; windowId: string };
  private deathEventPending = false;

  constructor(private readonly config: EnemyRuntimeConfig) {
    this.actor = new EnemyActor({
      id: config.id,
      definitionId: config.definition.id,
      hp: Math.max(0, config.hp),
      maxHp: Math.max(1, config.hp),
      x: config.position.x,
      y: config.position.y,
      alive: config.hp > 0,
    });
    this.controller = new EnemyController(config.definition);
  }

  update(observation: EnemyRuntimeObservation, dtMs: number): EnemyRuntimeFrame {
    if (!this.actor.snapshot.alive) {
      this.endActiveAttack();
      return { velocity: { x: 0, y: 0 }, recovering: false };
    }

    const intent = this.controller.step(observation, dtMs);
    const direction = normalizedDirection(observation.directionToPlayer);
    let velocity = { x: 0, y: 0 };
    let telegraph: EnemyRuntimeFrame['telegraph'];
    let attackWindowId: string | undefined;
    let recovering = false;

    switch (intent.type) {
      case 'moveToward':
        velocity = {
          x: direction.x * this.config.definition.moveSpeed,
          y: direction.y * this.config.definition.moveSpeed,
        };
        break;
      case 'moveAway':
        velocity = {
          x: -direction.x * this.config.definition.moveSpeed,
          y: -direction.y * this.config.definition.moveSpeed,
        };
        break;
      case 'strafe': {
        const sign = intent.bias >= 0 ? 1 : -1;
        velocity = {
          x: -direction.y * this.config.definition.moveSpeed * sign,
          y: direction.x * this.config.definition.moveSpeed * sign,
        };
        break;
      }
      case 'prepareAttack':
        this.endActiveAttack();
        telegraph = {
          attackId: intent.attackId,
          telegraphMs: intent.telegraphMs,
          cueKey: intent.cueKey,
        };
        break;
      case 'attack': {
        const attack = this.config.definition.attacks.find((candidate) => candidate.id === intent.attackId);
        if (attack) {
          if (!this.activeAttack || this.activeAttack.attackId !== attack.id) {
            this.endActiveAttack();
            this.activeAttack = {
              attackId: attack.id,
              windowId: this.config.combat.beginAttack({
                ownerId: this.config.id,
                rawDamage: attack.damage,
                critChance: 0,
                critDamage: 1,
              }),
            };
          }
          attackWindowId = this.activeAttack.windowId;
        }
        break;
      }
      case 'recover':
        recovering = true;
        this.endActiveAttack();
        break;
      case 'idle':
        this.endActiveAttack();
        break;
    }

    const snapshot = this.actor.snapshot;
    this.actor.setPosition(
      snapshot.x + velocity.x * Math.max(0, dtMs) / 1000,
      snapshot.y + velocity.y * Math.max(0, dtMs) / 1000,
    );

    return { velocity, telegraph, attackWindowId, recovering };
  }

  get snapshot() {
    return this.actor.snapshot;
  }

  getCombatTarget(): RuntimeCombatTarget {
    return {
      id: this.config.id,
      getHp: () => this.actor.snapshot.hp,
      getArmor: () => this.config.definition.armor,
      isInvulnerable: () => false,
      applyDamage: (amount) => {
        const wasAlive = this.actor.snapshot.alive;
        this.actor.damage(amount);
        if (wasAlive && !this.actor.snapshot.alive) {
          this.deathEventPending = true;
          this.endActiveAttack();
        }
      },
    };
  }

  isDead(): boolean {
    return !this.actor.snapshot.alive;
  }

  consumeDeathEvent(): boolean {
    if (!this.deathEventPending) return false;
    this.deathEventPending = false;
    return true;
  }

  private endActiveAttack(): void {
    if (!this.activeAttack) return;
    this.config.combat.endAttack(this.activeAttack.windowId);
    this.activeAttack = undefined;
  }
}
