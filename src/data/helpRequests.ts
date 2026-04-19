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
