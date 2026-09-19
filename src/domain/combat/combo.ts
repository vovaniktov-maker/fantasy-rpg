export interface ComboState {
  step: number;
  timeSinceAdvanceMs: number;
  chainLength: number;
  resetAfterMs: number;
}

export function resetCombo(state: ComboState): ComboState {
  return { ...state, step: 0, timeSinceAdvanceMs: 0 };
}

export function advanceCombo(state: ComboState, elapsedSinceLastAdvanceMs: number): ComboState {
  const timedOut = state.step > 0 && elapsedSinceLastAdvanceMs > state.resetAfterMs;
  const baseStep = timedOut ? 0 : state.step;
  return {
    ...state,
    step: Math.min(state.chainLength, baseStep + 1),
    timeSinceAdvanceMs: 0,
  };
}
