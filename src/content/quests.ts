export interface QuestDefinition {
  id: string;
  rewardItemIds: string[];
  rewardGold: number;
  rewardXp: number;
}

export const questDefinitions: QuestDefinition[] = [
  { id: 'bandit_leader_contract', rewardItemIds: ['black_amber_amulet'], rewardGold: 250, rewardXp: 300 },
];
