import { useGameSnapshot } from '../useGameSnapshot';

function Bar({ label, value, max, kind }: { label: string; value: number; max: number; kind: 'hp' | 'energy' }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className={`hud-bar hud-bar-${kind}`} aria-label={`${label} ${Math.round(value)} of ${Math.round(max)}`}>
      <span>{label}</span>
      <div className="hud-bar-track">
        <div className="hud-bar-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <strong>{Math.round(value)}/{Math.round(max)}</strong>
    </div>
  );
}

export function Hud() {
  const state = useGameSnapshot();
  return (
    <section className="hud" aria-label="Player status">
      <div className="hud-title">
        <strong>ROGUE</strong>
        <span>{state.screen.toUpperCase()}</span>
      </div>
      <Bar kind="hp" label="HP" value={state.player.hp} max={state.player.maxHp} />
      <Bar kind="energy" label="Energy" value={state.player.energy} max={state.player.maxEnergy} />
      <div className="hud-meta">Lv. {state.progression.level} · {state.economy.gold} gold</div>
    </section>
  );
}
