import type { ContentRegistry } from './contentRegistry.js';

export interface ValidationIssue {
  code: string;
  message: string;
}

export function validateContent(registry: ContentRegistry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const duplicate of registry.duplicates) {
    issues.push({ code: 'duplicate-id', message: `Duplicate ${duplicate.category} id: ${duplicate.id}` });
  }

  for (const skill of registry.skills.values()) {
    for (const prerequisite of skill.prerequisites) {
      if (!registry.skills.has(prerequisite)) issues.push({ code: 'missing-skill-prerequisite', message: `Skill ${skill.id} references missing prerequisite ${prerequisite}` });
    }
  }

  const knownTags = new Set<string>();
  for (const item of registry.items.values()) item.tags.forEach((tag) => knownTags.add(tag));
  for (const affix of registry.affixes.values()) {
    for (const tag of affix.compatibleItemTags) {
      if (!knownTags.has(tag)) issues.push({ code: 'unknown-affix-tag', message: `Affix ${affix.id} references incompatible or unknown item tag ${tag}` });
    }
  }

  for (const table of registry.lootTables.values()) {
    for (const entry of table.entries) {
      if (entry.weight < 0) issues.push({ code: 'negative-loot-weight', message: `Loot table ${table.id} has negative weight for ${entry.id}` });
      if (!registry.items.has(entry.id)) issues.push({ code: 'missing-loot-item', message: `Loot table ${table.id} references missing item ${entry.id}` });
    }
  }

  for (const quest of registry.quests.values()) {
    for (const reward of quest.rewardItemIds) {
      if (!registry.items.has(reward)) issues.push({ code: 'missing-quest-reward', message: `Quest ${quest.id} references missing reward item ${reward}` });
    }
  }

  return issues;
}
