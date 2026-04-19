import { supabase } from './supabase';
import type { HelpRequest } from '../types';

export async function createHelpRequest(
  choreId: string,
  requesterId: string
): Promise<HelpRequest> {
  const { data, error } = await supabase
    .from('help_requests')
    .insert({
      chore_id: choreId,
      requester_id: requesterId,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as HelpRequest;
}

export async function acceptHelpRequest(
  helpRequestId: string,
  helperId: string
): Promise<HelpRequest> {
  const { data, error } = await supabase
    .from('help_requests')
    .update({
      status: 'accepted',
      helper_id: helperId,
      responded_at: new Date().toISOString(),
    })
    .eq('id', helpRequestId)
    .select('*')
    .single();

  if (error) throw error;
  return data as HelpRequest;
}

export async function declineHelpRequest(
  helpRequestId: string
): Promise<HelpRequest> {
  const { data, error } = await supabase
    .from('help_requests')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', helpRequestId)
    .select('*')
    .single();

  if (error) throw error;
  return data as HelpRequest;
}

/** Check and expire help requests older than 24h, returning chore to in_progress */
export async function expireOldHelpRequests(choreId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: expired } = await supabase
    .from('help_requests')
    .select('id')
    .eq('chore_id', choreId)
    .eq('status', 'pending')
    .lt('created_at', cutoff);

  if (expired && expired.length > 0) {
    for (const req of expired) {
      await supabase
        .from('help_requests')
        .update({ status: 'expired', responded_at: new Date().toISOString() })
        .eq('id', req.id);
    }
    return true;
  }
  return false;
}

export async function getPendingHelpRequest(
  choreId: string
): Promise<HelpRequest | null> {
  const { data, error } = await supabase
    .from('help_requests')
    .select('*')
    .eq('chore_id', choreId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data as HelpRequest | null;
}
