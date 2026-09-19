export type StatusKind = 'poison' | 'bleed';

export interface StatusDefinition {
  id: string;
  kind: StatusKind;
  durationMs: number;
  maxStacks: number;
  tickIntervalMs: number;
  damagePerStackPerTick: number;
}

export interface StatusInstance extends StatusDefinition {
  stacks: number;
  remainingMs: number;
  elapsedSinceTickMs: number;
}

export function applyStatus(current: readonly StatusInstance[], definition: StatusDefinition): StatusInstance[] {
  const existing = current.find((status) => status.id === definition.id);
  if (!existing) {
    return [...current, { ...definition, stacks: 1, remainingMs: definition.durationMs, elapsedSinceTickMs: 0 }];
  }
  return current.map((status) => status.id === definition.id
    ? { ...status, ...definition, stacks: Math.min(definition.maxStacks, status.stacks + 1), remainingMs: definition.durationMs }
    : status);
}

export function tickStatuses(current: readonly StatusInstance[], dtMs: number): { statuses: StatusInstance[]; damage: number } {
  const dt = Math.max(0, dtMs);
  let damage = 0;
  const statuses: StatusInstance[] = [];
  for (const status of current) {
    const elapsed = status.elapsedSinceTickMs + dt;
    const ticks = status.tickIntervalMs > 0 ? Math.floor(elapsed / status.tickIntervalMs) : 0;
    if (ticks > 0) damage += ticks * status.damagePerStackPerTick * status.stacks;
    const remainingMs = Math.max(0, status.remainingMs - dt);
    if (remainingMs > 0) {
      statuses.push({ ...status, remainingMs, elapsedSinceTickMs: status.tickIntervalMs > 0 ? elapsed % status.tickIntervalMs : 0 });
    }
  }
  return { statuses, damage };
}
