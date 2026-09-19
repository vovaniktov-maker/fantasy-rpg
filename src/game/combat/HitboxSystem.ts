import type { DodgeState } from '../../domain/combat/dodge.js';

export class HitboxSystem {
  canReceiveHit(dodge: DodgeState): boolean {
    return dodge.invulnerableRemainingMs <= 0;
  }

  applyIncomingDamage(currentHp: number, damage: number, dodge: DodgeState): number {
    if (!this.canReceiveHit(dodge)) return currentHp;
    return Math.max(0, currentHp - Math.max(0, damage));
  }
}
