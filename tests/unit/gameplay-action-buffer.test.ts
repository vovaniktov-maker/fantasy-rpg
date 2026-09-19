import { describe, expect, it } from 'vitest';
import { GameplayActionBuffer } from '../../src/game/input/GameplayActionBuffer';

describe('GameplayActionBuffer', () => {
  it('preserves a short basic-attack press until the next runtime frame consumes it', () => {
    const input = new GameplayActionBuffer();
    input.queueBasicAttack();
    expect(input.consumeBasicAttack()).toBe(true);
    expect(input.consumeBasicAttack()).toBe(false);
  });

  it('clears buffered actions when gameplay input ownership changes', () => {
    const input = new GameplayActionBuffer();
    input.queueBasicAttack();
    input.clear();
    expect(input.consumeBasicAttack()).toBe(false);
  });
});
