export type DungeonRoomTag = 'entrance' | 'combat' | 'trap' | 'treasure' | 'bossApproach';

export interface DungeonRoomDefinition {
  id: string;
  tag: DungeonRoomTag;
  connectors: number;
  encounterIds?: string[];
  trapIds?: string[];
}

export interface GeneratedDungeonRoom {
  definitionId: string;
  tag: DungeonRoomTag;
  variant: number;
}

export interface GeneratedDungeon {
  seed: number;
  rooms: GeneratedDungeonRoom[];
}

export interface DungeonGenerationError {
  code: 'empty-config' | 'missing-required-room' | 'impossible-connectivity';
  message: string;
  roomIds: string[];
}

export type DungeonGenerationResult = { ok: true; dungeon: GeneratedDungeon } | { ok: false; error: DungeonGenerationError };

function rngFromSeed(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(values: readonly T[], random: () => number): T {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

export function generateDungeon(seed: number, definitions: readonly DungeonRoomDefinition[]): DungeonGenerationResult {
  if (definitions.length === 0) return { ok: false, error: { code: 'empty-config', message: 'No dungeon room definitions supplied', roomIds: [] } };
  const entrances = definitions.filter((room) => room.tag === 'entrance');
  const combats = definitions.filter((room) => room.tag === 'combat');
  const bosses = definitions.filter((room) => room.tag === 'bossApproach');
  if (entrances.length === 0 || combats.length === 0 || bosses.length === 0) {
    return { ok: false, error: { code: 'missing-required-room', message: 'Dungeon requires entrance, combat, and bossApproach rooms', roomIds: definitions.map((room) => room.id) } };
  }
  const impossible = definitions.filter((room) => (room.tag === 'entrance' || room.tag === 'bossApproach') && room.connectors < 1);
  if (impossible.length > 0) {
    return { ok: false, error: { code: 'impossible-connectivity', message: `Rooms cannot connect: ${impossible.map((room) => room.id).join(', ')}`, roomIds: impossible.map((room) => room.id) } };
  }

  const random = rngFromSeed(seed);
  const middlePool = definitions.filter((room) => room.tag === 'combat' || room.tag === 'trap' || room.tag === 'treasure');
  const middleCount = 3 + Math.floor(random() * 3);
  const selected: DungeonRoomDefinition[] = [pick(combats, random)];
  while (selected.length < middleCount) selected.push(pick(middlePool, random));
  const ordered = [pick(entrances, random), ...selected, pick(bosses, random)];
  return {
    ok: true,
    dungeon: {
      seed,
      rooms: ordered.map((room) => ({ definitionId: room.id, tag: room.tag, variant: Math.floor(random() * Math.max(1, room.connectors)) })),
    },
  };
}
