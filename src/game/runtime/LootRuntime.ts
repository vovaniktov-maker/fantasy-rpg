import type { ContentRegistry } from '../../domain/content/contentRegistry.js';
import { addSerializedItem, type SerializableInventoryState } from '../../domain/inventory/inventory.js';
import type { RandomSource } from '../../domain/items/itemGenerator.js';
import { rollLoot } from '../../domain/loot/lootTables.js';
import type { SerializableItemStack } from '../../domain/state/GameState.js';

export interface RuntimeDrop {
  item: SerializableItemStack;
  position: { x: number; y: number };
}

export interface RuntimeWorldPickup extends RuntimeDrop {
  readonly id: string;
  collected: boolean;
}

export interface LootRuntimeConfig {
  content: ContentRegistry;
  getInventory: () => SerializableInventoryState;
  setInventory: (inventory: SerializableInventoryState) => void;
  emit?: (event: { type: 'LOOT_PICKED_UP'; itemId: string }) => void;
  interactionRadius?: number;
}

export interface LootInteractionResult {
  collected: boolean;
  pickup?: RuntimeWorldPickup;
}

export class LootRuntime {
  private readonly pickups: RuntimeWorldPickup[] = [];
  private readonly interactionRadius: number;

  constructor(private readonly config: LootRuntimeConfig) {
    this.interactionRadius = Math.max(0, config.interactionRadius ?? 90);
  }

  spawnDrop(drop: RuntimeDrop): RuntimeWorldPickup {
    const pickup: RuntimeWorldPickup = {
      id: drop.item.instanceId,
      item: structuredClone(drop.item),
      position: { ...drop.position },
      collected: false,
    };
    this.pickups.push(pickup);
    return pickup;
  }

  activePickups(): RuntimeWorldPickup[] {
    return this.pickups.filter((pickup) => !pickup.collected).map((pickup) => ({
      ...pickup,
      item: structuredClone(pickup.item),
      position: { ...pickup.position },
    }));
  }

  tryInteract(playerPosition: { x: number; y: number }): LootInteractionResult {
    let candidate: RuntimeWorldPickup | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const pickup of this.pickups) {
      if (pickup.collected) continue;
      const distance = Math.hypot(
        pickup.position.x - playerPosition.x,
        pickup.position.y - playerPosition.y,
      );
      if (distance <= this.interactionRadius && distance < bestDistance) {
        candidate = pickup;
        bestDistance = distance;
      }
    }

    if (!candidate) return { collected: false };

    const result = addSerializedItem(
      this.config.getInventory(),
      candidate.item,
      this.config.content.items,
    );
    if (!result.added || result.remainder) {
      return { collected: false, pickup: candidate };
    }

    this.config.setInventory(result.state);
    candidate.collected = true;
    this.config.emit?.({ type: 'LOOT_PICKED_UP', itemId: candidate.item.instanceId });
    return { collected: true, pickup: candidate };
  }
}

const ENEMY_LOOT_TABLE: Record<string, string> = {
  bandit_melee: 'forest_common',
  bandit_cutthroat: 'forest_common',
  bandit_archer: 'forest_common',
  bandit_heavy: 'bandit_hideout',
  bandit_trapper: 'bandit_hideout',
};

export function createEnemyDrop(
  enemyDefinitionId: string,
  level: number,
  rng: RandomSource,
  content: ContentRegistry,
): SerializableItemStack | null {
  const tableId = ENEMY_LOOT_TABLE[enemyDefinitionId];
  if (!tableId) return null;
  const table = content.lootTables.get(tableId);
  if (!table) return null;
  const definitionId = rollLoot(table.entries, level, rng);
  if (!definitionId) return null;
  const definition = content.items.get(definitionId);
  if (!definition) return null;

  const roll = Math.floor(Math.max(0, Math.min(0.999999999, rng.next())) * 1_000_000_000).toString(36);
  return {
    instanceId: `drop-${enemyDefinitionId}-${definitionId}-${level}-${roll}`,
    definitionId,
    quantity: 1,
    itemLevel: Math.max(1, Math.floor(level)),
    rarity: definition.uniqueEffect ? 'unique' : definition.kind === 'gear' ? 'rare' : 'common',
  };
}
