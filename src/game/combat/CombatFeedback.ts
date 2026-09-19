export interface CombatFeedbackConfig {
  hitFlashMs: number;
  cameraShakeIntensity: number;
  cameraShakeMs: number;
  particles: boolean;
  trails: boolean;
  lighting: boolean;
}

export const DEFAULT_COMBAT_FEEDBACK: CombatFeedbackConfig = {
  hitFlashMs: 70,
  cameraShakeIntensity: 0.0035,
  cameraShakeMs: 70,
  particles: true,
  trails: true,
  lighting: true,
};

export type CombatFeedbackEvent =
  | { type: 'hit'; target: 'player' | 'enemy'; critical: boolean }
  | { type: 'attackTrail'; trailKey: string }
  | { type: 'bossCue'; cueKey: string };

export type CombatFeedbackCommand =
  | { type: 'hitFlash'; durationMs: number; target: 'player' | 'enemy' }
  | { type: 'cameraShake'; durationMs: number; intensity: number }
  | { type: 'particleBurst'; key: string; amount: number }
  | { type: 'attackTrail'; key: string }
  | { type: 'lightPulse'; key: string; durationMs: number };

export function feedbackForCombatEvent(event: CombatFeedbackEvent, config: CombatFeedbackConfig): CombatFeedbackCommand[] {
  if (event.type === 'hit') {
    const commands: CombatFeedbackCommand[] = [
      { type: 'hitFlash', durationMs: config.hitFlashMs, target: event.target },
      { type: 'cameraShake', durationMs: config.cameraShakeMs, intensity: event.critical ? config.cameraShakeIntensity * 1.5 : config.cameraShakeIntensity },
    ];
    if (config.particles) commands.push({ type: 'particleBurst', key: event.critical ? 'critical-hit' : 'hit', amount: event.critical ? 8 : 4 });
    return commands;
  }
  if (event.type === 'attackTrail') return config.trails ? [{ type: 'attackTrail', key: event.trailKey }] : [];
  const commands: CombatFeedbackCommand[] = [{ type: 'particleBurst', key: event.cueKey, amount: 6 }];
  if (config.lighting) commands.push({ type: 'lightPulse', key: event.cueKey, durationMs: 180 });
  return commands;
}
