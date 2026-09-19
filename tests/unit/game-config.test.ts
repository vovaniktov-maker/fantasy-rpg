import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, makeGameConfig } from '../../src/game/config/gameConfig';

describe('game config', () => {
  it('targets a deterministic 16:9 internal viewport and provided parent', () => {
    const config = makeGameConfig('game-root');
    expect(GAME_WIDTH / GAME_HEIGHT).toBeCloseTo(16 / 9, 5);
    expect(config.parent).toBe('game-root');
    expect(config.width).toBe(GAME_WIDTH);
    expect(config.height).toBe(GAME_HEIGHT);
  });
});
