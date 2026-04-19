import { supabase } from './supabase';
import type { Chore, CreateChoreInput } from '../types';

export async function getChoresByCouple(coupleId: string): Promise<Chore[]> {
  const { data, error } = await supabase
    .from('chores')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Chore[];
}

/**
 * Create a new chore.
 * - 나에게 할당: 바로 'pending' (수락 불필요)
 * - 파트너에게 할당: 'draft' (파트너 수락 필요)
 */
export async function createChore(input: CreateChoreInput): Promise<Chore> {
  const isSelfAssigned = input.created_by_id === input.assignee_id;

  const { data, error } = await supabase
    .from('chores')
    .insert({
      couple_id: input.couple_id,
      title: input.title,
      created_by_id: input.created_by_id,
      assignee_id: input.assignee_id,
      original_assignee_id: input.assignee_id,
      status: isSelfAssigned ? 'pending' : 'draft',
      due_date: input.due_date || null,
      proposed_reward_type: input.proposed_reward_type || null,
      proposed_reward_key: input.proposed_reward_key || null,
      proposed_reward_text: input.proposed_reward_text || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Chore;
}

export async function updateChoreStatus(
  choreId: string,
  status: Chore['status'],
  extra?: Partial<Chore>
): Promise<Chore> {
  const { data, error } = await supabase
    .from('chores')
    .update({ status, ...extra })
    .eq('id', choreId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Chore;
}

/** Assignee accepts the draft chore → status becomes 'pending' */
export async function acceptDraftChore(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'pending');
}

/** Assignee rejects the draft → chore is deleted */
export async function rejectDraftChore(choreId: string): Promise<void> {
  const { error } = await supabase
    .from('chores')
    .delete()
    .eq('id', choreId)
    .eq('status', 'draft');

  if (error) throw error;
}

/** Assignee starts the chore → status becomes 'in_progress' */
export async function startChore(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'in_progress');
}

/** Assignee requests help → status becomes 'help_requested', optionally with reward proposal */
export async function requestHelp(
  choreId: string,
  reward?: { type: 'template' | 'custom'; key?: string; text?: string }
): Promise<Chore> {
  const extra: Partial<Chore> = {};
  if (reward) {
    extra.proposed_reward_type = reward.type;
    extra.proposed_reward_key = reward.key || null;
    extra.proposed_reward_text = reward.text || null;
  }
  return updateChoreStatus(choreId, 'help_requested', extra);
}

/** Mark a chore as completed (optimistic lock: only if not already completed) */
export async function completeChore(
  choreId: string,
  completedById: string
): Promise<Chore> {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'completed',
      completed_by_id: completedById,
      completed_at: new Date().toISOString(),
    })
    .eq('id', choreId)
    .neq('status', 'completed')
    .select('*')
    .single();

  if (error) throw error;
  return data as Chore;
}

/** Reassign chore to a different user (after help accepted) */
export async function reassignChore(
  choreId: string,
  newAssigneeId: string
): Promise<Chore> {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'reassigned',
      assignee_id: newAssigneeId,
    })
    .eq('id', choreId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Chore;
}

/** Revert a reassigned chore back to 'in_progress' for the new assignee */
export async function revertToInProgress(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'in_progress');
}
