import type { SerializableItemStack } from '../../domain/state/GameState';
import { buildContentRegistry } from '../../domain/content/contentRegistry';

const registry = buildContentRegistry();

export function ItemTooltip({ item }: { item: SerializableItemStack | null }) {
  if (!item) return <aside className="item-tooltip empty">Select an item</aside>;
  const definition = registry.items.get(item.definitionId);
  return (
    <aside className={`item-tooltip rarity-${item.rarity ?? 'common'}`}>
      <strong>{definition?.name ?? item.definitionId}</strong>
      <span>Item level {item.itemLevel ?? 1}</span>
      <span>Quantity {item.quantity}</span>
      {definition?.baseModifiers?.map((modifier) => (
        <span key={`${modifier.stat}-${modifier.mode}`}>{modifier.stat}: {modifier.mode === 'flat' ? '+' : '+'}{modifier.value}</span>
      ))}
      {definition?.uniqueEffect && <em>{definition.uniqueEffect}</em>}
    </aside>
  );
}
