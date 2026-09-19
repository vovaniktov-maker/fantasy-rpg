export type BanditQuestStatus = 'available' | 'accepted' | 'leaderDefeated' | 'returnToOutpost' | 'completed';
export type QuestEvent = 'accept' | 'leaderDefeated' | 'returnToOutpost';

export interface QuestState {
  status: BanditQuestStatus;
  rewardClaimed: boolean;
}

export function advanceQuest(state: QuestState, event: QuestEvent): QuestState {
  if (state.rewardClaimed || state.status === 'completed') return state;
  if (event === 'accept' && state.status === 'available') return { ...state, status: 'accepted' };
  if (event === 'leaderDefeated' && state.status === 'accepted') return { ...state, status: 'leaderDefeated' };
  if (event === 'returnToOutpost' && state.status === 'leaderDefeated') return { ...state, status: 'returnToOutpost' };
  return state;
}

export function canTurnInQuest(state: QuestState): boolean {
  return state.status === 'returnToOutpost' && !state.rewardClaimed;
}

export function turnInQuest(state: QuestState): { success: boolean; state: QuestState } {
  if (!canTurnInQuest(state)) return { success: false, state };
  return { success: true, state: { status: 'completed', rewardClaimed: true } };
}
