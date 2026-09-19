import type { GeneratedDungeon } from '../../domain/dungeon/dungeonGenerator.js';

export interface AssembledRoomPlacement {
  definitionId: string;
  x: number;
  y: number;
  variant: number;
}

export class DungeonAssembler {
  assemble(dungeon: GeneratedDungeon, roomWidth = 640): AssembledRoomPlacement[] {
    return dungeon.rooms.map((room, index) => ({ definitionId: room.definitionId, x: index * roomWidth, y: 0, variant: room.variant }));
  }
}
