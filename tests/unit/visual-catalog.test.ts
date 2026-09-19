import { describe, expect, it } from 'vitest';
import { enemyDefinitions } from '../../src/content/enemies';
import { itemDefinitions } from '../../src/content/items';
import { enemyTextureKey, itemTextureKey, getRarityColor } from '../../src/game/visuals/VisualCatalog';

describe('VisualCatalog', () => {
  it('maps every authored enemy to a distinct readable texture key', () => {
    const keys = enemyDefinitions.map((enemy) => enemyTextureKey(enemy.id));
    expect(new Set(keys).size).toBe(enemyDefinitions.length);
    expect(keys.every((key) => key.startsWith('enemy-'))).toBe(true);
  });

  it('maps every item definition to a non-placeholder visual key', () => {
    for (const item of itemDefinitions) {
      const key = itemTextureKey(item);
      expect(key).not.toBe('loot-placeholder');
      expect(key.length).toBeGreaterThan(3);
    }
  });

  it('assigns stable rarity presentation colors', () => {
    expect(getRarityColor('common')).toBeTypeOf('number');
    expect(getRarityColor('rare')).not.toBe(getRarityColor('common'));
    expect(getRarityColor('unique')).not.toBe(getRarityColor('legendary'));
  });
});
