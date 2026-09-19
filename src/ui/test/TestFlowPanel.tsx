import { gameBridge } from '../../game/bridge/GameBridge';
import { getDefaultGameSession } from '../../game/GameSession';
import { useGameSnapshot } from '../useGameSnapshot';

export function TestFlowPanel() {
  const state = useGameSnapshot();
  const session = getDefaultGameSession();
  return (
    <section className="test-flow" aria-label="Deterministic test controls">
      <strong>Test mode · {state.screen}</strong>
      <button onClick={() => session.enterForest()}>Enter forest</button>
      <button onClick={() => session.completeForestEncounter()}>Defeat encounter</button>
      <button onClick={() => session.grantLoot('steel_dagger')}>Pick up test loot</button>
      <button onClick={() => session.enterHideout()}>Enter hideout</button>
      <button onClick={() => session.enterBoss()}>Reach boss</button>
      <button onClick={() => session.markBanditLeaderDefeated()}>Defeat boss</button>
      <button onClick={() => session.enterOutpost()}>Return to outpost</button>
      <button onClick={() => gameBridge.dispatch({ type: 'SAVE_GAME' })}>Save game</button>
    </section>
  );
}
