import { describe, expect, it } from 'vitest';
import { createRuntimeRandom, deriveRuntimeSeed } from '../../src/game/runtime/RuntimeRandom';

describe('RuntimeRandom', () => {
  it('derives stable independent streams from the same run seed', () => {
    const forestArcherSeed = deriveRuntimeSeed(424243, 'forest-bandit_archer-2');
    const forestArcherAgain = deriveRuntimeSeed(424243, 'forest-bandit_archer-2');
    const forestTrapperSeed = deriveRuntimeSeed(424243, 'forest-bandit_trapper-4');

    expect(forestArcherSeed).toBe(forestArcherAgain);
    expect(forestArcherSeed).not.toBe(forestTrapperSeed);

    const a = createRuntimeRandom(forestArcherSeed);
    const b = createRuntimeRandom(forestArcherAgain);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('keeps a loot stream unchanged when a separate combat stream advances', () => {
    const lootA = createRuntimeRandom(deriveRuntimeSeed(424243, 'loot:forest-bandit_melee-0'));
    const lootB = createRuntimeRandom(deriveRuntimeSeed(424243, 'loot:forest-bandit_melee-0'));
    const combat = createRuntimeRandom(deriveRuntimeSeed(424243, 'combat'));

    for (let index = 0; index < 20; index += 1) combat.next();

    expect(lootA.next()).toBe(lootB.next());
    expect(lootA.next()).toBe(lootB.next());
  });
});
