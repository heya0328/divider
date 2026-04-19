export type ChoreStatus = 'draft' | 'pending' | 'in_progress' | 'help_requested' | 'reassigned' | 'completed';
export type HelpRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type RewardStatus = 'pending' | 'accepted' | 'used';
export type RewardType = 'template' | 'custom';

export interface User {
  id: string;
  toss_user_id: string;
  nickname: string;
  couple_id: string | null;
  created_at: string;
}

export interface Couple {
  id: string;
  invite_code: string;
  invite_code_expires_at: string;
  user_a_id: string;
  user_b_id: string | null;
  matched_at: string | null;
  created_at: string;
}

export interface Chore {
  id: string;
  couple_id: string;
  title: string;
  created_by_id: string;
  assignee_id: string;
  original_assignee_id: string;
  status: ChoreStatus;
  due_date: string | null;
  completed_by_id: string | null;
  completed_at: string | null;
  proposed_reward_type: RewardType | null;
  proposed_reward_key: string | null;
  proposed_reward_text: string | null;
  created_at: string;
}

export interface HelpRequest {
  id: string;
  chore_id: string;
  requester_id: string;
  helper_id: string | null;
  status: HelpRequestStatus;
  created_at: string;
  responded_at: string | null;
}

export interface Reward {
  id: string;
  chore_id: string;
  giver_id: string;
  receiver_id: string;
  type: RewardType;
  template_key: string | null;
  custom_text: string | null;
  status: RewardStatus;
  created_at: string;
  used_at: string | null;
}

export interface RewardTemplate {
  key: string;
  label: string;
  emoji: string;
}

export interface CreateChoreInput {
  couple_id: string;
  title: string;
  created_by_id: string;
  assignee_id: string;
  due_date?: string;
  proposed_reward_type?: RewardType;
  proposed_reward_key?: string;
  proposed_reward_text?: string;
}

export interface CreateRewardInput {
  chore_id: string;
  giver_id: string;
  receiver_id: string;
  type: RewardType;
  template_key?: string;
  custom_text?: string;
}
