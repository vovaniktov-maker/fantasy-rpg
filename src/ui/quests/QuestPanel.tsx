import { gameBridge } from '../../game/bridge/GameBridge';
import { useGameSnapshot } from '../useGameSnapshot';

export function QuestPanel({ open }: { open: boolean }) {
  const state = useGameSnapshot();
  if (!open) return null;
  const status = state.quests.bandit_leader_contract ?? 'available';
  return (
    <section className="panel quest-panel" aria-label="Quest log">
      <h2>Bandit Leader Contract</h2>
      <p>Stop the bandits controlling the Cursed Forest trade routes.</p>
      <strong>Status: {status}</strong>
      {status === 'available' && <button onClick={() => gameBridge.dispatch({ type: 'ACCEPT_QUEST', questId: 'bandit_leader_contract' })}>Accept</button>}
      {status === 'returnToOutpost' && <button onClick={() => gameBridge.dispatch({ type: 'TURN_IN_QUEST', questId: 'bandit_leader_contract' })}>Turn in</button>}
    </section>
  );
}
