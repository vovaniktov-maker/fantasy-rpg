import { advanceCombo, type ComboState } from '../../domain/combat/combo.js';
import { beginDodge, tickDodge, type DodgeState } from '../../domain/combat/dodge.js';
import { spendEnergy, tickEnergy, type EnergyState } from '../../domain/combat/energy.js';

export interface PlayerCombatConfig {
  energy: number;
  maxEnergy: number;
  learnedSkills: ReadonlySet<string>;
  equippedSkills: Array<string | null>;
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
}

export class PlayerCombatController {
  private energyState: EnergyState;
  private dodgeState: DodgeState = { active: false, remainingMs: 0, invulnerableRemainingMs: 0 };
  private comboState: ComboState = { step: 0, timeSinceAdvanceMs: 0, chainLength: 3, resetAfterMs: 600 };
  private readonly learnedSkills: Set<string>;
  private readonly equippedSkills: Array<string | null>;
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
    this.dodgeCost = config.dodgeCost ?? 30;
    this.dodgeDurationMs = config.dodgeDurationMs ?? 260;
    this.dodgeInvulnerabilityMs = config.dodgeInvulnerabilityMs ?? 160;
  }

  tick(dtMs: number): void {
    this.energyState = tickEnergy(this.energyState, dtMs);
    this.dodgeState = tickDodge(this.dodgeState, dtMs);
    this.comboState = { ...this.comboState, timeSinceAdvanceMs: this.comboState.timeSinceAdvanceMs + Math.max(0, dtMs) };
  }

  requestDodge(): { started: boolean } {
    if (this.energyState.current < this.dodgeCost) return { started: false };
    const result = beginDodge(this.dodgeState, this.dodgeDurationMs, this.dodgeInvulnerabilityMs);
    if (!result.started) return { started: false };
    this.dodgeState = result.state;
    this.energyState = spendEnergy(this.energyState, this.dodgeCost);
    return { started: true };
  }

  requestBasicAttack(): { accepted: boolean; comboStep: number } {
    if (this.dodgeState.active) return { accepted: false, comboStep: this.comboState.step };
    this.comboState = advanceCombo(this.comboState, this.comboState.timeSinceAdvanceMs);
    return { accepted: true, comboStep: this.comboState.step };
  }

  requestSkill(slotIndex: number): { accepted: boolean; skillId?: string } {
    const skillId = this.equippedSkills[slotIndex] ?? null;
    if (!skillId || !this.learnedSkills.has(skillId)) return { accepted: false };
    return { accepted: true, skillId };
  }

  getSnapshot(): PlayerCombatSnapshot {
    return { energy: this.energyState.current, dodge: { ...this.dodgeState }, combo: { ...this.comboState } };
  }
}
