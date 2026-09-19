import test from 'node:test';
import assert from 'node:assert/strict';
import { GameBridge } from '../../src/game/bridge/GameBridge.js';

test('publishes snapshots and disposes listeners cleanly', () => {
  const bridge = new GameBridge();
  let first = 0;
  let second = 0;
  const offFirst = bridge.subscribe(() => { first += 1; });
  bridge.publish({ screen: 'outpost' });
  assert.equal(first, 1);
  offFirst();
  bridge.publish({ screen: 'forest' });
  assert.equal(first, 1);
  const offSecond = bridge.subscribe(() => { second += 1; });
  bridge.publish({ screen: 'hideout' });
  bridge.publish({ screen: 'outpost' });
  assert.equal(second, 2);
  offSecond();
});

test('dispatches commands once per active listener', () => {
  const bridge = new GameBridge();
  let seen = 0;
  const off = bridge.onCommand((command) => { if (command.type === 'SAVE_GAME') seen += 1; });
  bridge.dispatch({ type: 'SAVE_GAME' });
  off();
  bridge.dispatch({ type: 'SAVE_GAME' });
  assert.equal(seen, 1);
});
