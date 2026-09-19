import type { ItemDefinition, ItemInstance } from '../items/itemTypes.js';
import type { SerializableItemStack } from '../state/GameState.js';

export interface InventoryState {
  capacity: number;
  slots: Array<ItemInstance | null>;
}

export interface AddItemResult {
  added: boolean;
  state: InventoryState;
  remainder?: ItemInstance;
}

export interface SerializableInventoryState {
  capacity: number;
  slots: Array<SerializableItemStack | null>;
}

export interface SerializedAddResult {
  added: boolean;
  state: SerializableInventoryState;
  remainder?: SerializableItemStack;
}

export function createInventory(capacity: number): InventoryState {
  const size = Math.max(0, Math.floor(capacity));
  return { capacity: size, slots: Array.from({ length: size }, () => null) };
}

function sameStack(a: ItemInstance, b: ItemInstance): boolean {
  return a.stackable && b.stackable && a.definitionId === b.definitionId && a.rarity === b.rarity && JSON.stringify(a.affixes) === JSON.stringify(b.affixes);
}

export function addItem(state: InventoryState, item: ItemInstance): AddItemResult {
  const next: InventoryState = { capacity: state.capacity, slots: state.slots.map((slot) => slot ? structuredClone(slot) : null) };
  let remaining = Math.max(0, item.quantity);

  if (item.stackable) {
    for (let i = 0; i < next.slots.length && remaining > 0; i += 1) {
      const slot = next.slots[i];
      if (!slot || !sameStack(slot, item) || slot.quantity >= slot.maxStack) continue;
      const room = slot.maxStack - slot.quantity;
      const moved = Math.min(room, remaining);
      slot.quantity += moved;
      remaining -= moved;
    }
  }

  while (remaining > 0) {
    const empty = next.slots.findIndex((slot) => slot === null);
    if (empty < 0) {
      if (remaining === item.quantity) return { added: false, state };
      return { added: true, state: next, remainder: { ...structuredClone(item), quantity: remaining } };
    }
    const moved = item.stackable ? Math.min(item.maxStack, remaining) : 1;
    next.slots[empty] = { ...structuredClone(item), instanceId: remaining === item.quantity ? item.instanceId : `${item.instanceId}-${remaining}`, quantity: moved };
    remaining -= moved;
  }

  return { added: true, state: next };
}

function sameSerializedStack(a: SerializableItemStack, b: SerializableItemStack): boolean {
  return a.definitionId === b.definitionId
    && a.rarity === b.rarity
    && JSON.stringify(a.affixIds ?? []) === JSON.stringify(b.affixIds ?? []);
}

export function addSerializedItem(
  state: SerializableInventoryState,
  item: SerializableItemStack,
  definitions: ReadonlyMap<string, ItemDefinition>,
): SerializedAddResult {
  const definition = definitions.get(item.definitionId);
  if (!definition || item.quantity <= 0) {
    return { added: false, state, remainder: structuredClone(item) };
  }

  const next: SerializableInventoryState = {
    capacity: state.capacity,
    slots: state.slots.map((slot) => slot ? structuredClone(slot) : null),
  };
  let remaining = Math.max(0, Math.floor(item.quantity));

  if (definition.stackable) {
    for (let i = 0; i < next.slots.length && remaining > 0; i += 1) {
      const slot = next.slots[i];
      if (!slot || !sameSerializedStack(slot, item) || slot.quantity >= definition.maxStack) continue;
      const room = definition.maxStack - slot.quantity;
      const moved = Math.min(room, remaining);
      slot.quantity += moved;
      remaining -= moved;
    }
  }

  while (remaining > 0) {
    const empty = next.slots.findIndex((slot) => slot === null);
    if (empty < 0) {
      return { added: false, state, remainder: { ...structuredClone(item), quantity: item.quantity } };
    }
    const moved = definition.stackable ? Math.min(definition.maxStack, remaining) : 1;
    next.slots[empty] = {
      ...structuredClone(item),
      instanceId: remaining === item.quantity ? item.instanceId : `${item.instanceId}-${remaining}`,
      quantity: moved,
    };
    remaining -= moved;
  }

  return { added: true, state: next };
}

export function removeItem(state: InventoryState, instanceId: string, quantity = 1): { removed: boolean; state: InventoryState; item?: ItemInstance } {
  const index = state.slots.findIndex((slot) => slot?.instanceId === instanceId);
  if (index < 0 || quantity <= 0) return { removed: false, state };
  const next = { capacity: state.capacity, slots: state.slots.map((slot) => slot ? structuredClone(slot) : null) };
  const slot = next.slots[index]!;
  const removedQty = Math.min(slot.quantity, quantity);
  const removed = { ...structuredClone(slot), quantity: removedQty };
  slot.quantity -= removedQty;
  if (slot.quantity <= 0) next.slots[index] = null;
  return { removed: true, state: next, item: removed };
}
