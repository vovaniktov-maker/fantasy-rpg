import type { CoreStats } from '../../domain/stats/stats.js';
import { PlayerCombatController } from '../player/PlayerCombatController.js';
import { PlayerController } from '../player/PlayerController.js';
import type { GameplayControlSnapshot } from './GameplayControlState.js';
import { CombatRuntime } from './CombatRuntime.js';
import type { RuntimeCombatTarget } from './runtimeTypes.js';

export interface PlayerRuntimeInput {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  basicAttackPressed: boolean;
  dodgePressed: boolean;
  skillSlotPressed: number | null;
}

export interface PlayerRuntimeConfig {
  id: string;
  position: { x: number; y: number };
  hp: number;
  stats: CoreStats;
  learnedSkills: ReadonlySet<string>;
  equippedSkills: Array<string | null>;
  combat: CombatRuntime;
}

export interface PlayerRuntimeFrame {
  velocity: { x: number; y: number };
  facingRadians: number;
  dodgeStarted: boolean;
  attackStarted: boolean;
  attackWindowId?: string;
  comboStep?: number;
  skillStarted: boolean;
  skillId?: string;
  skillAttackWindowId?: string;
}

export interface PlayerRuntimeSnapshot {
  hp: number;
  energy: number;
  position: { x: number; y: number };
  facingRadians: number;
  invulnerable: boolean;
}

interface ActiveSkillRuntimeDefinition {
  energyCost: number;
  damageMultiplier?: number;
  cooldownMs: number;
  dashMultiplier?: number;
}

const ACTIVE_SKILLS: Record<string, ActiveSkillRuntimeDefinition> = {
  shadow_dash: { energyCost: 35, damageMultiplier: 1.35, cooldownMs: 900, dashMultiplier: 2.4 },
  blade_fan: { energyCost: 30, damageMultiplier: 0.9, cooldownMs: 1200 },
  riposte: { energyCost: 25, damageMultiplier: 1.2, cooldownMs: 1000 },
  flurry: { energyCost: 40, damageMultiplier: 1.8, cooldownMs: 1500 },
  poison_strike: { energyCost: 25, damageMultiplier: 1.15, cooldownMs: 800 },
  venom_trap: { energyCost: 35, damageMultiplier: 0.8, cooldownMs: 1600 },
  smoke_bomb: { energyCost: 30, cooldownMs: 1800 },
};

export class PlayerRuntime {
  private stats: CoreStats;
  private readonly movement: PlayerController;
  private combatController: PlayerCombatController;
  private controls: GameplayControlSnapshot = { inputEnabled: true, paused: false };
  private position: { x: number; y: number };
  private hp: number;
  private facingRadians = 0;
  private readonly cooldowns = new Map<string, number>();
  private activeBasicAttack?: { id: string; remainingMs: number };

  constructor(private readonly config: PlayerRuntimeConfig) {
    this.stats = { ...config.stats };
    this.position = { ...config.position };
    this.hp = Math.min(config.hp, this.stats.hp);
    this.movement = new PlayerController(this.stats.moveSpeed);
    this.combatController = this.createCombatController(this.combatController?.getSnapshot().energy ?? this.stats.energy);
  }

  setControls(snapshot: GameplayControlSnapshot): void {
    this.controls = { ...snapshot };
  }

  applyDerivedStats(stats: CoreStats): void {
    const energy = this.combatController.getSnapshot().energy;
    this.stats = { ...stats };
    this.combatController = this.createCombatController(Math.min(energy, stats.energy));
    this.hp = Math.min(this.hp, stats.hp);
  }

  update(input: PlayerRuntimeInput, dtMs: number): PlayerRuntimeFrame {
    const dt = Math.max(0, dtMs);
    this.combatController.tick(dt);
    this.tickCooldowns(dt);
    if (this.activeBasicAttack) {
      this.activeBasicAttack.remainingMs -= dt;
      if (this.activeBasicAttack.remainingMs <= 0) {
        this.config.combat.endAttack(this.activeBasicAttack.id);
        this.activeBasicAttack = undefined;
      }
    }

    if (!this.controls.inputEnabled || this.controls.paused) {
      return {
        velocity: { x: 0, y: 0 },
        facingRadians: this.facingRadians,
        dodgeStarted: false,
        attackStarted: false,
        skillStarted: false,
      };
    }

    const movement = this.movement.step({
      dtMs: dt,
      moveX: input.moveX,
      moveY: input.moveY,
      playerX: this.position.x,
      playerY: this.position.y,
      aimX: input.aimX,
      aimY: input.aimY,
      dodgePressed: input.dodgePressed,
    });
    this.facingRadians = movement.facingRadians;

    let dodgeStarted = false;
    let velocity = movement.velocity;
    if (input.dodgePressed) {
      const dodge = this.combatController.requestDodge();
      dodgeStarted = dodge.started;
      if (dodge.started) {
        let dx = input.moveX;
        let dy = input.moveY;
        const length = Math.hypot(dx, dy);
        if (length <= 0.0001) {
          dx = Math.cos(this.facingRadians);
          dy = Math.sin(this.facingRadians);
        } else {
          dx /= length;
          dy /= length;
        }
        const dodgeDurationSeconds = 0.26;
        const dodgeSpeed = this.stats.dodgeDistance / dodgeDurationSeconds;
        velocity = { x: dx * dodgeSpeed, y: dy * dodgeSpeed };
      }
    }

    let attackStarted = false;
    let attackWindowId: string | undefined;
    let comboStep: number | undefined;
    if (input.basicAttackPressed && !dodgeStarted) {
      const attack = this.combatController.requestBasicAttack();
      if (attack.accepted) {
        attackStarted = true;
        comboStep = attack.comboStep;
        attackWindowId = this.config.combat.beginAttack({
          ownerId: this.config.id,
          rawDamage: this.stats.attackPower * attack.damageMultiplier,
          critChance: this.stats.critChance,
          critDamage: this.stats.critDamage,
        });
        this.activeBasicAttack = { id: attackWindowId, remainingMs: attack.activeMs };
      }
    }

    let skillStarted = false;
    let skillId: string | undefined;
    let skillAttackWindowId: string | undefined;
    if (input.skillSlotPressed !== null && !dodgeStarted) {
      const candidate = this.config.equippedSkills[input.skillSlotPressed] ?? null;
      const definition = candidate ? ACTIVE_SKILLS[candidate] : undefined;
      if (candidate && definition && (this.cooldowns.get(candidate) ?? 0) <= 0) {
        const skill = this.combatController.requestSkill(input.skillSlotPressed, definition.energyCost);
        if (skill.accepted && skill.skillId) {
          skillStarted = true;
          skillId = skill.skillId;
          this.cooldowns.set(skillId, definition.cooldownMs);
          if (definition.damageMultiplier) {
            skillAttackWindowId = this.config.combat.beginAttack({
              ownerId: this.config.id,
              rawDamage: this.stats.attackPower * definition.damageMultiplier,
              critChance: this.stats.critChance,
              critDamage: this.stats.critDamage,
            });
          }
          if (definition.dashMultiplier) {
            const dashSpeed = this.stats.moveSpeed * definition.dashMultiplier;
            velocity = {
              x: Math.cos(this.facingRadians) * dashSpeed,
              y: Math.sin(this.facingRadians) * dashSpeed,
            };
          }
        }
      }
    }

    this.position.x += velocity.x * dt / 1000;
    this.position.y += velocity.y * dt / 1000;

    return {
      velocity,
      facingRadians: this.facingRadians,
      dodgeStarted,
      attackStarted,
      attackWindowId,
      comboStep,
      skillStarted,
      skillId,
      skillAttackWindowId,
    };
  }

  get snapshot(): PlayerRuntimeSnapshot {
    const combat = this.combatController.getSnapshot();
    return {
      hp: this.hp,
      energy: combat.energy,
      position: { ...this.position },
      facingRadians: this.facingRadians,
      invulnerable: combat.dodge.invulnerableRemainingMs > 0,
    };
  }

  getCombatTarget(): RuntimeCombatTarget {
    return {
      id: this.config.id,
      getHp: () => this.hp,
      getArmor: () => this.stats.armor,
      isInvulnerable: () => this.combatController.getSnapshot().dodge.invulnerableRemainingMs > 0,
      applyDamage: (amount) => { this.hp = Math.max(0, this.hp - Math.max(0, amount)); },
    };
  }

  private createCombatController(energy: number): PlayerCombatController {
    return new PlayerCombatController({
      energy,
      maxEnergy: this.stats.energy,
      learnedSkills: this.config.learnedSkills,
      equippedSkills: this.config.equippedSkills,
      attackSpeed: this.stats.attackSpeed,
    });
  }

  private tickCooldowns(dtMs: number): void {
    for (const [skillId, remaining] of this.cooldowns) {
      const next = Math.max(0, remaining - dtMs);
      if (next <= 0) this.cooldowns.delete(skillId);
      else this.cooldowns.set(skillId, next);
    }
  }
}
