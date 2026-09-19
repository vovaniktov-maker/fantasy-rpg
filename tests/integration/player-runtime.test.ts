import { describe, expect, it } from 'vitest';
import { PlayerController } from '../../src/game/player/PlayerController';
import { PlayerCombatController } from '../../src/game/player/PlayerCombatController';

describe('player runtime controllers', () => {
  it('normalizes movement and keeps mouse-facing independent', () => {
    const controller = new PlayerController(180);
    const next = controller.step({ dtMs: 16, moveX: 1, moveY: 1, playerX: 0, playerY: 0, aimX: 100, aimY: 0, dodgePressed: true });
    expect(Math.hypot(next.velocity.x, next.velocity.y)).toBeCloseTo(180);
    expect(next.facingRadians).toBeCloseTo(0);
    expect(next.requestedDodge).toBe(true);
  });
  it('does not double-spend dodge energy', () => {
    const combat = new PlayerCombatController({ energy: 100, maxEnergy: 100, learnedSkills: new Set(), equippedSkills: [] });
    expect(combat.requestDodge().started).toBe(true);
    expect(combat.getSnapshot().energy).toBe(70);
    expect(combat.requestDodge().started).toBe(false);
    expect(combat.getSnapshot().energy).toBe(70);
  });
});
