import { addItem, type InventoryState } from '../inventory/inventory.js';
import type { ItemInstance } from '../items/itemTypes.js';

export interface MerchantOffer {
  id: string;
  item: ItemInstance;
  price: number;
  quantity: number;
}

export interface MerchantState { stock: MerchantOffer[]; }
export interface PurchaseContext { gold: number; inventory: InventoryState; merchant: MerchantState; }

export function buyItem(context: PurchaseContext, offerId: string): PurchaseContext & { success: boolean } {
  const offer = context.merchant.stock.find((entry) => entry.id === offerId);
  if (!offer || offer.quantity <= 0 || offer.price < 0 || context.gold < offer.price) return { ...context, success: false };
  const add = addItem(context.inventory, { ...structuredClone(offer.item), instanceId: `${offer.item.instanceId}-${offer.quantity}` });
  if (!add.added || add.remainder) return { ...context, success: false };
  const merchant: MerchantState = { stock: context.merchant.stock.map((entry) => entry.id === offerId ? { ...entry, quantity: entry.quantity - 1 } : { ...entry }) };
  return { success: true, gold: context.gold - offer.price, inventory: add.state, merchant };
}

export function sellItem(context: PurchaseContext, instanceId: string, price: number): PurchaseContext & { success: boolean } {
  const index = context.inventory.slots.findIndex((item) => item?.instanceId === instanceId);
  if (index < 0 || price < 0) return { ...context, success: false };
  const slots = context.inventory.slots.map((slot) => slot ? structuredClone(slot) : null);
  slots[index] = null;
  return { ...context, success: true, gold: context.gold + price, inventory: { ...context.inventory, slots } };
}
