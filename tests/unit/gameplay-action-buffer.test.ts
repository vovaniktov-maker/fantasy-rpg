import { describe, expect, it } from 'vitest';
import { GameplayActionBuffer } from '../../src/game/input/GameplayActionBuffer';

describe('GameplayActionBuffer', () => {
  it('preserves short discrete actions until the next runtime frame consumes them', () => {
    const input = new GameplayActionBuffer();

    input.queueBasicAttack();
    input.queueInteract();
    input.queueDodge();
    input.queueSkillSlot(2);

    expect(input.consumeBasicAttack()).toBe(true);
    expect(input.consumeInteract()).toBe(true);
    expect(input.consumeDodge()).toBe(true);
    expect(input.consumeSkillSlot()).toBe(2);

    expect(input.consumeBasicAttack()).toBe(false);
    expect(input.consumeInteract()).toBe(false);
    expect(input.consumeDodge()).toBe(false);
    expect(input.consumeSkillSlot()).toBeNull();
  });

  it('clears buffered actions when gameplay input ownership changes', () => {
    const input = new GameplayActionBuffer();
    input.queueBasicAttack();
    input.queueInteract();
    input.queueDodge();
    input.queueSkillSlot(1);

    input.clear();

    expect(input.consumeBasicAttack()).toBe(false);
    expect(input.consumeInteract()).toBe(false);
    expect(input.consumeDodge()).toBe(false);
    expect(input.consumeSkillSlot()).toBeNull();
  });
});
