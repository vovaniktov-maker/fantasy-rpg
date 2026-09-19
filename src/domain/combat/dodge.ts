export interface DodgeState {
  active: boolean;
  remainingMs: number;
  invulnerableRemainingMs: number;
}

export interface BeginDodgeResult {
  started: boolean;
  state: DodgeState;
}

export function beginDodge(state: DodgeState, durationMs: number, invulnerabilityMs: number): BeginDodgeResult {
  if (state.active) return { started: false, state };
  return {
    started: true,
    state: { active: true, remainingMs: Math.max(0, durationMs), invulnerableRemainingMs: Math.max(0, invulnerabilityMs) },
  };
}

export function tickDodge(state: DodgeState, dtMs: number): DodgeState {
  const dt = Math.max(0, dtMs);
  const remainingMs = Math.max(0, state.remainingMs - dt);
  const invulnerableRemainingMs = Math.max(0, state.invulnerableRemainingMs - dt);
  return { active: remainingMs > 0, remainingMs, invulnerableRemainingMs };
}
