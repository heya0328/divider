import { supabase } from './supabase';
import type { Reward, CreateRewardInput } from '../types';

export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .insert({
      chore_id: input.chore_id,
      giver_id: input.giver_id,
      receiver_id: input.receiver_id,
      type: input.type,
      template_key: input.template_key ?? null,
      custom_text: input.custom_text ?? null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Reward;
}

export async function getRewardsByUser(userId: string): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Reward[];
}

export async function acceptReward(rewardId: string): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update({ status: 'accepted' })
    .eq('id', rewardId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Reward;
}

export async function useReward(rewardId: string): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update({
      status: 'used',
      used_at: new Date().toISOString(),
    })
    .eq('id', rewardId)
    .select('*')
    .single();

  if (error) throw error;
  return data as Reward;
}
