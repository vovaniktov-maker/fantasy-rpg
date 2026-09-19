export interface RuntimeTuning {
  rngSeed: number;
  enemyHpMultiplier: number;
  timingMultiplier: number;
}

export const DEFAULT_RUNTIME_TUNING: RuntimeTuning = {
  rngSeed: 1,
  enemyHpMultiplier: 1,
  timingMultiplier: 1,
};

export const TEST_RUNTIME_TUNING: RuntimeTuning = {
  rngSeed: 424242,
  enemyHpMultiplier: 0.01,
  timingMultiplier: 1,
};

export function getRuntimeTuning(search = typeof window !== 'undefined' ? window.location.search : ''): RuntimeTuning {
  return new URLSearchParams(search).get('testMode') === '1'
    ? TEST_RUNTIME_TUNING
    : DEFAULT_RUNTIME_TUNING;
}
