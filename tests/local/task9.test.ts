import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerController } from '../../src/game/player/PlayerController.js';
import { PlayerCombatController } from '../../src/game/player/PlayerCombatController.js';
import { HitboxSystem } from '../../src/game/combat/HitboxSystem.js';

test('player step normalizes movement and aims independently', () => {
  const controller = new PlayerController(180);
  const next = controller.step({ dtMs: 16, moveX: 1, moveY: 1, playerX: 0, playerY: 0, aimX: 100, aimY: 0, dodgePressed: true });
  assert.ok(next.velocity.x > 0 && next.velocity.y > 0);
  assert.ok(Math.hypot(next.velocity.x, next.velocity.y) <= 180.001);
  assert.ok(Math.abs(next.facingRadians) < 1e-9);
  assert.equal(next.requestedDodge, true);
});

test('combat controller spends dodge energy once and respects learned active skills', () => {
  const combat = new PlayerCombatController({ energy: 100, maxEnergy: 100, learnedSkills: new Set(['shadow_dash']), equippedSkills: ['shadow_dash', null, null, null] });
  assert.equal(combat.requestDodge().started, true);
  assert.equal(combat.getSnapshot().energy, 70);
  assert.equal(combat.requestDodge().started, false);
  assert.equal(combat.getSnapshot().energy, 70);
  assert.equal(combat.requestSkill(0).accepted, true);
  assert.equal(combat.requestSkill(1).accepted, false);
});

test('hitbox system ignores damage during i-frames', () => {
  const hitboxes = new HitboxSystem();
  assert.equal(hitboxes.applyIncomingDamage(100, 20, { active: true, remainingMs: 100, invulnerableRemainingMs: 50 }), 100);
  assert.equal(hitboxes.applyIncomingDamage(100, 20, { active: false, remainingMs: 0, invulnerableRemainingMs: 0 }), 80);
});
