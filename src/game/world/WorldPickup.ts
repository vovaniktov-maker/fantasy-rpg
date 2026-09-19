import { addItem, type InventoryState } from '../../domain/inventory/inventory.js';
import type { ItemInstance } from '../../domain/items/itemTypes.js';

export class WorldPickup {
  collected = false;

  constructor(
    readonly item: ItemInstance,
    private readonly getInventory: () => InventoryState,
    private readonly setInventory: (inventory: InventoryState) => void,
    private readonly emit: (event: { type: 'LOOT_PICKED_UP'; itemId: string }) => void,
  ) {}

  tryCollect(): boolean {
    if (this.collected) return false;
    const result = addItem(this.getInventory(), this.item);
    if (!result.added || result.remainder) return false;
    this.setInventory(result.state);
    this.collected = true;
    this.emit({ type: 'LOOT_PICKED_UP', itemId: this.item.instanceId });
    return true;
  }
}
