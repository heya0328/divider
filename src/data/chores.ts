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

/** Create a new chore in 'draft' status */
export async function createChore(input: CreateChoreInput): Promise<Chore> {
  const { data, error } = await supabase
    .from('chores')
    .insert({
      couple_id: input.couple_id,
      title: input.title,
      created_by_id: input.created_by_id,
      assignee_id: input.assignee_id,
      original_assignee_id: input.assignee_id,
      status: 'draft',
      due_date: input.due_date,
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

/** Assignee rejects the draft → creator gets it back as 'pending' */
export async function rejectDraftChore(
  choreId: string,
  creatorId: string
): Promise<Chore> {
  const { data, error } = await supabase
    .from('chores')
    .update({
      status: 'pending',
      assignee_id: creatorId,
    })
    .eq('id', choreId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Chore;
}

/** Assignee starts the chore → status becomes 'in_progress' */
export async function startChore(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'in_progress');
}

/** Assignee requests help → status becomes 'help_requested' */
export async function requestHelp(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'help_requested');
}

/** Mark a chore as completed */
export async function completeChore(
  choreId: string,
  completedById: string
): Promise<Chore> {
  return updateChoreStatus(choreId, 'completed', {
    completed_by_id: completedById,
    completed_at: new Date().toISOString(),
  });
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
