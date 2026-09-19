export interface EnergyState {
  current: number;
  max: number;
  regenPerSecond: number;
  regenDelayMs: number;
  msSinceSpend: number;
}

export function spendEnergy(state: EnergyState, amount: number): EnergyState {
  const spent = Math.max(0, Math.min(state.current, amount));
  return { ...state, current: state.current - spent, msSinceSpend: spent > 0 ? 0 : state.msSinceSpend };
}

export function tickEnergy(state: EnergyState, dtMs: number): EnergyState {
  const dt = Math.max(0, dtMs);
  const before = state.msSinceSpend;
  const after = before + dt;
  const regenMs = Math.max(0, after - Math.max(state.regenDelayMs, before));
  const regenerated = state.regenPerSecond * (regenMs / 1000);
  return { ...state, current: Math.min(state.max, state.current + regenerated), msSinceSpend: after };
}
