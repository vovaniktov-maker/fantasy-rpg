export class DungeonEncounterGate {
  private readonly remaining: number[];
  private active: number | null;

  constructor(enemyCountsByRoom: readonly number[]) {
    this.remaining = enemyCountsByRoom.map((count) => Math.max(0, Math.floor(count)));
    this.active = this.findNextActiveRoom(0);
  }

  get activeRoomIndex(): number | null {
    return this.active;
  }

  get cleared(): boolean {
    return this.active === null;
  }

  isRoomActive(roomIndex: number): boolean {
    return this.active === roomIndex;
  }

  remainingInRoom(roomIndex: number): number {
    return this.remaining[roomIndex] ?? 0;
  }

  recordEnemyDeath(roomIndex: number): void {
    if (this.active !== roomIndex) return;
    const current = this.remaining[roomIndex] ?? 0;
    if (current <= 0) return;

    this.remaining[roomIndex] = current - 1;
    if (this.remaining[roomIndex] > 0) return;

    this.active = this.findNextActiveRoom(roomIndex + 1);
  }

  private findNextActiveRoom(startIndex: number): number | null {
    for (let index = Math.max(0, startIndex); index < this.remaining.length; index += 1) {
      if ((this.remaining[index] ?? 0) > 0) return index;
    }
    return null;
  }
}
