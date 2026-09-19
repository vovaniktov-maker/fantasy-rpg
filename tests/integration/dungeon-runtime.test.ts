import { describe, expect, it } from 'vitest';
import { dungeonRoomDefinitions } from '../../src/content/dungeonRooms';
import { generateDungeon } from '../../src/domain/dungeon/dungeonGenerator';
import { DungeonAssembler } from '../../src/game/world/DungeonAssembler';

describe('dungeon runtime assembly', () => {
  it('assembles deterministic encounter metadata for the same generated dungeon', () => {
    const generatedA = generateDungeon(1234, dungeonRoomDefinitions);
    const generatedB = generateDungeon(1234, dungeonRoomDefinitions);
    expect(generatedA).toEqual(generatedB);
    if (!generatedA.ok || !generatedB.ok) throw new Error('generation failed');

    const assembler = new DungeonAssembler(dungeonRoomDefinitions);
    expect(assembler.assemble(generatedA.dungeon)).toEqual(assembler.assemble(generatedB.dungeon));
    expect(assembler.assemble(generatedA.dungeon).some((room) => room.encounterIds.length > 0)).toBe(true);
  });
});
