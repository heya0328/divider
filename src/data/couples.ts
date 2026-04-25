import { supabase } from './supabase';
import type { User, Couple } from '../types';
import { INVITE_CODE_EXPIRY_HOURS } from '../constants';

/** Generate a random 6-character alphanumeric invite code */
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Find an existing user by toss_user_id or create a new one.
 * Does NOT assign a couple yet.
 */
export async function findOrCreateUser(
  tossUserId: string,
  nickname: string
): Promise<User> {
  // Try to find existing user
  const { data: existing, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('toss_user_id', tossUserId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing as User;

  // Create new user
  const { data: created, error: createError } = await supabase
    .from('users')
    .insert({ toss_user_id: tossUserId, nickname })
    .select('*')
    .single();

  if (createError) throw createError;
  return created as User;
}

/**
 * Create a new couple with an invite code, setting the current user as user_a.
 * Also updates the user's couple_id.
 */
export async function createInviteCode(userId: string): Promise<Couple> {
  const inviteCode = generateInviteCode();
  const expiresAt = new Date(
    Date.now() + INVITE_CODE_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .insert({
      invite_code: inviteCode,
      invite_code_expires_at: expiresAt,
      user_a_id: userId,
    })
    .select('*')
    .single();

  if (coupleError) throw coupleError;

  // Update user's couple_id
  const { error: userError } = await supabase
    .from('users')
    .update({ couple_id: couple.id })
    .eq('id', userId);

  if (userError) throw userError;

  return couple as Couple;
}

/**
 * Join an existing couple using an invite code.
 * Sets the current user as user_b and marks the couple as matched.
 */
export async function joinWithCode(
  userId: string,
  inviteCode: string
): Promise<Couple> {
  const now = new Date().toISOString();

  // Find the couple
  const { data: couple, error: findError } = await supabase
    .from('couples')
    .select('*')
    .eq('invite_code', inviteCode)
    .is('user_b_id', null)
    .gt('invite_code_expires_at', now)
    .maybeSingle();

  if (findError) throw findError;
  if (!couple) throw new Error('Invalid or expired invite code');

  if (couple.user_a_id === userId) {
    throw new Error('자기 자신의 코드는 입력할 수 없어요');
  }

  // Update couple with user_b
  const { data: updated, error: updateError } = await supabase
    .from('couples')
    .update({
      user_b_id: userId,
      matched_at: now,
    })
    .eq('id', couple.id)
    .select('*')
    .single();

  if (updateError) throw updateError;

  // Update user's couple_id
  const { error: userError } = await supabase
    .from('users')
    .update({ couple_id: couple.id })
    .eq('id', userId);

  if (userError) throw userError;

  return updated as Couple;
}

/**
 * Get couple info by couple ID.
 */
export async function getCoupleInfo(coupleId: string): Promise<Couple> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('id', coupleId)
    .single();

  if (error) throw error;
  return data as Couple;
}

/**
 * Get the partner of the current user within a couple.
 */
export async function getPartner(
  userId: string,
  coupleId: string
): Promise<User | null> {
  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('user_a_id, user_b_id')
    .eq('id', coupleId)
    .single();

  if (coupleError) throw coupleError;
  if (!couple) return null;

  const partnerId =
    couple.user_a_id === userId ? couple.user_b_id : couple.user_a_id;

  if (!partnerId) return null;

  const { data: partner, error: partnerError } = await supabase
    .from('users')
    .select('*')
    .eq('id', partnerId)
    .single();

  if (partnerError) throw partnerError;
  return partner as User;
}
