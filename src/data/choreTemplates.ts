import { supabase } from './supabase';
import type { ChoreTemplate, CreateChoreTemplateInput } from '../types';

export async function getTemplatesByCouple(coupleId: string): Promise<ChoreTemplate[]> {
  const { data, error } = await supabase
    .from('chore_templates')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChoreTemplate[];
}

export async function createChoreTemplate(input: CreateChoreTemplateInput): Promise<ChoreTemplate> {
  const { data, error } = await supabase
    .from('chore_templates')
    .insert({
      couple_id: input.couple_id,
      title: input.title,
      created_by_id: input.created_by_id,
      assignee_id: input.assignee_id,
      recurrence_type: input.recurrence_type,
      recurrence_days: input.recurrence_days,
      monthly_nth: input.monthly_nth ?? null,
      monthly_weekday: input.monthly_weekday ?? null,
      proposed_reward_type: input.proposed_reward_type ?? null,
      proposed_reward_key: input.proposed_reward_key ?? null,
      proposed_reward_text: input.proposed_reward_text ?? null,
      last_generated_date: new Date().toISOString().split('T')[0],
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ChoreTemplate;
}

export async function toggleTemplate(templateId: string, isActive: boolean): Promise<ChoreTemplate> {
  const { data, error } = await supabase
    .from('chore_templates')
    .update({ is_active: isActive })
    .eq('id', templateId)
    .select('*')
    .single();
  if (error) throw error;
  return data as ChoreTemplate;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('chore_templates')
    .delete()
    .eq('id', templateId);
  if (error) throw error;
}

function getNthWeekdayOfMonth(year: number, month: number, nth: number, weekday: number): Date | null {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (d.getDay() === weekday) {
      count++;
      if (count === nth) return d;
    }
  }
  return null;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function collectDates(template: ChoreTemplate, startDateStr: string, endDateStr: string): string[] {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const dates: string[] = [];

  if (template.recurrence_type === 'weekly') {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= end) {
      if (template.recurrence_days.includes(cursor.getDay())) {
        dates.push(toDateString(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (template.recurrence_type === 'monthly') {
    if (template.monthly_nth == null || template.monthly_weekday == null) return dates;
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const cursor = new Date(startMonth);
    while (cursor <= endMonth) {
      const target = getNthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), template.monthly_nth, template.monthly_weekday);
      if (target && target > start && target <= end) {
        dates.push(toDateString(target));
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return dates;
}

export async function syncRecurringChores(coupleId: string): Promise<number> {
  const todayStr = toDateString(new Date());
  const { data: templates, error: fetchErr } = await supabase
    .from('chore_templates')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('is_active', true);

  if (fetchErr || !templates) return 0;
  let totalCreated = 0;

  for (const template of templates as ChoreTemplate[]) {
    const startDate = template.last_generated_date ?? template.created_at.split('T')[0];
    if (startDate >= todayStr) continue;

    const targetDates = collectDates(template, startDate, todayStr);
    if (targetDates.length === 0) {
      await supabase.from('chore_templates').update({ last_generated_date: todayStr }).eq('id', template.id);
      continue;
    }

    const choresToInsert = targetDates.map(date => ({
      couple_id: template.couple_id,
      title: template.title,
      created_by_id: template.created_by_id,
      assignee_id: template.assignee_id,
      original_assignee_id: template.assignee_id,
      status: 'pending' as const,
      due_date: date,
      template_id: template.id,
      proposed_reward_type: template.proposed_reward_type,
      proposed_reward_key: template.proposed_reward_key,
      proposed_reward_text: template.proposed_reward_text,
    }));

    const { error: insertErr } = await supabase.from('chores').insert(choresToInsert);
    if (!insertErr) {
      totalCreated += choresToInsert.length;
      await supabase.from('chore_templates').update({ last_generated_date: todayStr }).eq('id', template.id);
    }
  }
  return totalCreated;
}
