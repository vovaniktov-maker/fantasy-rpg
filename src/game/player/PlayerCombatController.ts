import { advanceCombo, type ComboState } from '../../domain/combat/combo.js';
import { beginDodge, tickDodge, type DodgeState } from '../../domain/combat/dodge.js';
import { spendEnergy, tickEnergy, type EnergyState } from '../../domain/combat/energy.js';

export interface PlayerCombatConfig {
  energy: number;
  maxEnergy: number;
  learnedSkills: ReadonlySet<string>;
  equippedSkills: Array<string | null>;
  attackSpeed?: number;
  dodgeCost?: number;
  dodgeDurationMs?: number;
  dodgeInvulnerabilityMs?: number;
  energyRegenPerSecond?: number;
  energyRegenDelayMs?: number;
}

export interface PlayerCombatSnapshot {
  energy: number;
  dodge: DodgeState;
  combo: ComboState;
  attackRecoveryRemainingMs: number;
}

export interface BasicAttackRequest {
  accepted: boolean;
  comboStep: number;
  activeMs: number;
  recoveryMs: number;
  damageMultiplier: number;
}

const COMBO_WINDOWS = [
  { activeMs: 110, recoveryMs: 170, damageMultiplier: 1 },
  { activeMs: 115, recoveryMs: 175, damageMultiplier: 1 },
  { activeMs: 150, recoveryMs: 260, damageMultiplier: 1.35 },
] as const;

export class PlayerCombatController {
  private energyState: EnergyState;
  private dodgeState: DodgeState = { active: false, remainingMs: 0, invulnerableRemainingMs: 0 };
  private comboState: ComboState = { step: 0, timeSinceAdvanceMs: 0, chainLength: 3, resetAfterMs: 600 };
  private attackRecoveryRemainingMs = 0;
  private readonly learnedSkills: Set<string>;
  private readonly equippedSkills: Array<string | null>;
  private readonly attackSpeed: number;
  private readonly dodgeCost: number;
  private readonly dodgeDurationMs: number;
  private readonly dodgeInvulnerabilityMs: number;

  constructor(config: PlayerCombatConfig) {
    this.energyState = {
      current: config.energy,
      max: config.maxEnergy,
      regenPerSecond: config.energyRegenPerSecond ?? 40,
      regenDelayMs: config.energyRegenDelayMs ?? 500,
      msSinceSpend: 9999,
    };
    this.learnedSkills = new Set(config.learnedSkills);
    this.equippedSkills = [...config.equippedSkills].slice(0, 4);
    while (this.equippedSkills.length < 4) this.equippedSkills.push(null);
    this.attackSpeed = Math.max(0.1, config.attackSpeed ?? 1);
    this.dodgeCost = config.dodgeCost ?? 30;
    this.dodgeDurationMs = config.dodgeDurationMs ?? 260;
    this.dodgeInvulnerabilityMs = config.dodgeInvulnerabilityMs ?? 160;
  }

  tick(dtMs: number): void {
    const dt = Math.max(0, dtMs);
    this.energyState = tickEnergy(this.energyState, dt);
    this.dodgeState = tickDodge(this.dodgeState, dt);
    this.comboState = { ...this.comboState, timeSinceAdvanceMs: this.comboState.timeSinceAdvanceMs + dt };
    this.attackRecoveryRemainingMs = Math.max(0, this.attackRecoveryRemainingMs - dt);
  }

  requestDodge(): { started: boolean } {
    if (this.energyState.current < this.dodgeCost) return { started: false };
    const result = beginDodge(this.dodgeState, this.dodgeDurationMs, this.dodgeInvulnerabilityMs);
    if (!result.started) return { started: false };
    this.dodgeState = result.state;
    this.energyState = spendEnergy(this.energyState, this.dodgeCost);
    return { started: true };
  }

  requestBasicAttack(): BasicAttackRequest {
    if (this.dodgeState.active || this.attackRecoveryRemainingMs > 0) {
      return { accepted: false, comboStep: this.comboState.step, activeMs: 0, recoveryMs: 0, damageMultiplier: 1 };
    }
    this.comboState = advanceCombo(this.comboState, this.comboState.timeSinceAdvanceMs);
    const window = COMBO_WINDOWS[Math.max(0, this.comboState.step - 1)] ?? COMBO_WINDOWS[0];
    const activeMs = Math.round(window.activeMs / this.attackSpeed);
    const recoveryMs = Math.round(window.recoveryMs / this.attackSpeed);
    this.attackRecoveryRemainingMs = activeMs + recoveryMs;
    return {
      accepted: true,
      comboStep: this.comboState.step,
      activeMs,
      recoveryMs,
      damageMultiplier: window.damageMultiplier,
    };
  }

  requestSkill(slotIndex: number, energyCost = 0): { accepted: boolean; skillId?: string } {
    if (this.dodgeState.active) return { accepted: false };
    const skillId = this.equippedSkills[slotIndex] ?? null;
    if (!skillId || !this.learnedSkills.has(skillId) || this.energyState.current < energyCost) return { accepted: false };
    if (energyCost > 0) this.energyState = spendEnergy(this.energyState, energyCost);
    return { accepted: true, skillId };
  }

  getSnapshot(): PlayerCombatSnapshot {
    return {
      energy: this.energyState.current,
      dodge: { ...this.dodgeState },
      combo: { ...this.comboState },
      attackRecoveryRemainingMs: this.attackRecoveryRemainingMs,
    };
  }
}
