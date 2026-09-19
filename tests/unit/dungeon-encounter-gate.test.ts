import { describe, expect, it } from 'vitest';
import { DungeonEncounterGate } from '../../src/game/world/DungeonEncounterGate';

describe('DungeonEncounterGate', () => {
  it('activates one populated room at a time and skips empty rooms', () => {
    const gate = new DungeonEncounterGate([1, 2, 0, 1]);

    expect(gate.activeRoomIndex).toBe(0);
    expect(gate.isRoomActive(0)).toBe(true);
    expect(gate.isRoomActive(1)).toBe(false);

    gate.recordEnemyDeath(0);
    expect(gate.activeRoomIndex).toBe(1);

    gate.recordEnemyDeath(1);
    expect(gate.activeRoomIndex).toBe(1);

    gate.recordEnemyDeath(1);
    expect(gate.activeRoomIndex).toBe(3);

    gate.recordEnemyDeath(3);
    expect(gate.activeRoomIndex).toBeNull();
    expect(gate.cleared).toBe(true);
  });

  it('ignores death notifications from inactive rooms', () => {
    const gate = new DungeonEncounterGate([1, 1]);

    gate.recordEnemyDeath(1);

    expect(gate.activeRoomIndex).toBe(0);
    expect(gate.remainingInRoom(1)).toBe(1);
  });
});
