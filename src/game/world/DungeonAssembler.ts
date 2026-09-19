import type { DungeonRoomDefinition, GeneratedDungeon } from '../../domain/dungeon/dungeonGenerator.js';

export interface AssembledRoomPlacement {
  definitionId: string;
  x: number;
  y: number;
  variant: number;
  encounterIds: string[];
  trapIds: string[];
}

export class DungeonAssembler {
  private readonly definitions: ReadonlyMap<string, DungeonRoomDefinition>;

  constructor(definitions: readonly DungeonRoomDefinition[] = []) {
    this.definitions = new Map(definitions.map((room) => [room.id, room]));
  }

  assemble(dungeon: GeneratedDungeon, roomWidth = 640): AssembledRoomPlacement[] {
    return dungeon.rooms.map((room, index) => {
      const definition = this.definitions.get(room.definitionId);
      return {
        definitionId: room.definitionId,
        x: index * roomWidth,
        y: 0,
        variant: room.variant,
        encounterIds: [...(definition?.encounterIds ?? [])],
        trapIds: [...(definition?.trapIds ?? [])],
      };
    });
  }
}
