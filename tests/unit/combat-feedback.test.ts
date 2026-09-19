import { describe, expect, it } from 'vitest';
import { feedbackForCombatEvent, DEFAULT_COMBAT_FEEDBACK } from '../../src/game/combat/CombatFeedback';

describe('combat feedback', () => {
  it('maps a confirmed hit to restrained visual feedback without changing damage', () => {
    const commands = feedbackForCombatEvent({ type: 'hit', target: 'enemy', critical: false }, DEFAULT_COMBAT_FEEDBACK);
    expect(commands.some((command) => command.type === 'hitFlash')).toBe(true);
    expect(commands.some((command) => command.type === 'cameraShake')).toBe(true);
  });

  it('keeps optional lighting disabled when configured off', () => {
    const commands = feedbackForCombatEvent({ type: 'bossCue', cueKey: 'leader-smoke' }, { ...DEFAULT_COMBAT_FEEDBACK, lighting: false });
    expect(commands.some((command) => command.type === 'lightPulse')).toBe(false);
  });
});
