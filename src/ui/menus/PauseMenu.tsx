import { gameBridge } from '../../game/bridge/GameBridge';

export function PauseMenu({ open, onResume }: { open: boolean; onResume: () => void }) {
  if (!open) return null;
  return (
    <section className="panel pause-menu" aria-label="Pause menu">
      <h2>Paused</h2>
      <button onClick={onResume}>Resume</button>
      <button onClick={() => gameBridge.dispatch({ type: 'SAVE_GAME' })}>Save game</button>
      <p>WASD move · Mouse aim · LMB/RMB attack · 1–4 skills · Space dodge · E interact</p>
    </section>
  );
}
