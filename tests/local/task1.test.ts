import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_HEIGHT, GAME_WIDTH, makeGameConfig } from '../../src/game/config/gameConfig.js';

test('game config uses deterministic 16:9 viewport and parent', () => {
  const config = makeGameConfig('game-root');
  assert.ok(Math.abs(GAME_WIDTH / GAME_HEIGHT - 16 / 9) < 0.00001);
  assert.equal(config.parent, 'game-root');
  assert.equal(config.width, GAME_WIDTH);
  assert.equal(config.height, GAME_HEIGHT);
});
