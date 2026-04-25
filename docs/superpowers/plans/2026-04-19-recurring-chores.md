# Recurring Chores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add recurring chore templates (weekly with multi-day, monthly nth-weekday) that auto-generate chores on app load.

**Architecture:** New `chore_templates` table stores recurrence rules. `syncRecurringChores()` in `src/data/choreTemplates.ts` runs on Home mount after `refreshData()`, computing missed dates from `last_generated_date` and bulk-inserting chores as `pending`. ChoreCreate gets a recurrence picker; MyPage gets a template list with toggle/delete.

**Tech Stack:** Supabase (PostgreSQL), React, TDS components (`ListRow`, `Checkbox`, `ListHeader`, `Badge`, `Switch`), TypeScript

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/002_recurring_chores.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add template_id to chores
ALTER TABLE chores ADD COLUMN template_id UUID;

-- Create chore_templates table
CREATE TABLE chore_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('weekly', 'monthly')),
  recurrence_days INTEGER[] DEFAULT '{}',
  monthly_nth INTEGER CHECK (monthly_nth IS NULL OR (monthly_nth >= 1 AND monthly_nth <= 4)),
  monthly_weekday INTEGER CHECK (monthly_weekday IS NULL OR (monthly_weekday >= 0 AND monthly_weekday <= 6)),
  proposed_reward_type reward_type,
  proposed_reward_key TEXT,
  proposed_reward_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK from chores to templates
ALTER TABLE chores ADD CONSTRAINT chores_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES chore_templates(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_chore_templates_couple_id ON chore_templates(couple_id);
CREATE INDEX idx_chore_templates_active ON chore_templates(couple_id, is_active);
CREATE INDEX idx_chores_template_id ON chores(template_id);

-- RLS (MVP: allow all)
ALTER TABLE chore_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON chore_templates FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db reset` (or apply migration manually if Supabase is running)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_recurring_chores.sql
git commit -m "feat: add chore_templates table and template_id to chores"
```

---

### Task 2: Types & Constants

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/constants/index.ts`

- [ ] **Step 1: Add types to `src/types/index.ts`**

Add after the `RewardType` line (line 4):

```typescript
export type RecurrenceType = 'weekly' | 'monthly';
```

Add `template_id` to the `Chore` interface (after `created_at` on line 38):

```typescript
  template_id: string | null;
```

Add `ChoreTemplate` interface after `CreateRewardInput` (after line 88):

```typescript
export interface ChoreTemplate {
  id: string;
  couple_id: string;
  title: string;
  created_by_id: string;
  assignee_id: string;
  recurrence_type: RecurrenceType;
  recurrence_days: number[];
  monthly_nth: number | null;
  monthly_weekday: number | null;
  proposed_reward_type: RewardType | null;
  proposed_reward_key: string | null;
  proposed_reward_text: string | null;
  is_active: boolean;
  last_generated_date: string | null;
  created_at: string;
}

export interface CreateChoreTemplateInput {
  couple_id: string;
  title: string;
  created_by_id: string;
  assignee_id: string;
  recurrence_type: RecurrenceType;
  recurrence_days: number[];
  monthly_nth?: number;
  monthly_weekday?: number;
  proposed_reward_type?: RewardType;
  proposed_reward_key?: string;
  proposed_reward_text?: string;
}
```

- [ ] **Step 2: Add constants to `src/constants/index.ts`**

Add after `HELP_REQUEST_EXPIRY_HOURS` (line 12):

```typescript
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export const NTH_LABELS = ['첫째', '둘째', '셋째', '넷째'];
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/constants/index.ts
git commit -m "feat: add ChoreTemplate types and recurrence constants"
```

---

### Task 3: Data Layer — choreTemplates.ts

**Files:**
- Create: `src/data/choreTemplates.ts`

- [ ] **Step 1: Create the choreTemplates data module**

Create `src/data/choreTemplates.ts` with CRUD + sync logic:

```typescript
import { supabase } from './supabase';
import type { ChoreTemplate, CreateChoreTemplateInput } from '../types';

// ─── CRUD ────────────────────────────────────────────────────────────────────

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

// ─── Date Helpers ────────────────────────────────────────────────────────────

/** Get the nth occurrence of a weekday in a given month (1-indexed nth) */
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
  return null; // e.g., no 4th Friday in this month
}

/** Format Date to YYYY-MM-DD string */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Collect all target dates between startDate (exclusive) and endDate (inclusive) */
function collectDates(
  template: ChoreTemplate,
  startDateStr: string,
  endDateStr: string
): string[] {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const dates: string[] = [];

  if (template.recurrence_type === 'weekly') {
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() + 1); // startDate is exclusive
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
      const target = getNthWeekdayOfMonth(
        cursor.getFullYear(),
        cursor.getMonth(),
        template.monthly_nth,
        template.monthly_weekday
      );
      if (target && target > start && target <= end) {
        dates.push(toDateString(target));
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return dates;
}

// ─── Sync ────────────────────────────────────────────────────────────────────

/** Sync recurring chores — called on Home mount after refreshData */
export async function syncRecurringChores(coupleId: string): Promise<number> {
  const todayStr = toDateString(new Date());

  // Fetch active templates
  const { data: templates, error: fetchErr } = await supabase
    .from('chore_templates')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('is_active', true);

  if (fetchErr || !templates) return 0;

  let totalCreated = 0;

  for (const template of templates as ChoreTemplate[]) {
    const startDate = template.last_generated_date ?? template.created_at.split('T')[0];

    // Skip if already generated for today
    if (startDate >= todayStr) continue;

    const targetDates = collectDates(template, startDate, todayStr);
    if (targetDates.length === 0) {
      // Still update last_generated_date to avoid re-checking
      await supabase
        .from('chore_templates')
        .update({ last_generated_date: todayStr })
        .eq('id', template.id);
      continue;
    }

    // Bulk insert chores
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

    const { error: insertErr } = await supabase
      .from('chores')
      .insert(choresToInsert);

    if (!insertErr) {
      totalCreated += choresToInsert.length;
      await supabase
        .from('chore_templates')
        .update({ last_generated_date: todayStr })
        .eq('id', template.id);
    }
  }

  return totalCreated;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/data/choreTemplates.ts
git commit -m "feat: add choreTemplates data layer with CRUD and sync logic"
```

---

### Task 4: Integrate Sync into Home

**Files:**
- Modify: `src/pages/Home/Home.tsx`

- [ ] **Step 1: Add sync call to Home loadData**

Add import at the top of `src/pages/Home/Home.tsx` (after line 7):

```typescript
import { syncRecurringChores } from '../../data/choreTemplates';
```

Modify the `loadData` callback (lines 18-23) to call sync after the first `refreshData()`:

```typescript
  const loadData = useCallback(async () => {
    await refreshData();
    // Sync recurring chore templates
    if (user?.couple_id) {
      const created = await syncRecurringChores(user.couple_id);
      if (created > 0) await refreshData();
    }
    for (const c of chores.filter(ch => ch.status === 'help_requested')) {
      const expired = await expireOldHelpRequests(c.id);
      if (expired) await revertToInProgress(c.id);
    }
    await refreshData();
  }, [refreshData, chores, user?.couple_id]);
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home/Home.tsx
git commit -m "feat: sync recurring chores on Home mount"
```

---

### Task 5: ChoreCard — Recurring Indicator

**Files:**
- Modify: `src/components/ChoreCard.tsx`

- [ ] **Step 1: Add 🔁 indicator for template-generated chores**

In `src/components/ChoreCard.tsx`, modify the title `<Text>` element (around line 108-113) to append a recurring indicator:

Replace:

```typescript
          <Text
            typography="t6"
            fontWeight="bold"
            color={isCompleted ? adaptive.grey400 : adaptive.grey800}
          >
            {chore.title}
          </Text>
```

With:

```typescript
          <Text
            typography="t6"
            fontWeight="bold"
            color={isCompleted ? adaptive.grey400 : adaptive.grey800}
          >
            {chore.template_id ? '🔁 ' : ''}{chore.title}
          </Text>
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ChoreCard.tsx
git commit -m "feat: show recurring icon on template-generated chores"
```

---

### Task 6: RecurrencePicker Component

**Files:**
- Create: `src/components/RecurrencePicker.tsx`

- [ ] **Step 1: Create the RecurrencePicker component**

Create `src/components/RecurrencePicker.tsx`:

```typescript
import { Spacing, Text, Checkbox, ListRow } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import type { RecurrenceType } from '../types';
import { WEEKDAY_LABELS, NTH_LABELS } from '../constants';

export interface RecurrenceValue {
  type: RecurrenceType;
  days: number[];        // weekly only
  monthlyNth?: number;   // monthly only
  monthlyWeekday?: number; // monthly only
}

interface RecurrencePickerProps {
  value: RecurrenceValue | null;
  onChange: (value: RecurrenceValue | null) => void;
}

type ModeType = 'none' | 'weekly' | 'monthly';

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const mode: ModeType = value?.type ?? 'none';

  const handleModeChange = (newMode: ModeType) => {
    if (newMode === 'none') {
      onChange(null);
    } else if (newMode === 'weekly') {
      onChange({ type: 'weekly', days: [] });
    } else {
      onChange({ type: 'monthly', days: [], monthlyNth: 1, monthlyWeekday: 0 });
    }
  };

  const toggleDay = (day: number) => {
    if (!value || value.type !== 'weekly') return;
    const days = value.days.includes(day)
      ? value.days.filter(d => d !== day)
      : [...value.days, day].sort();
    onChange({ ...value, days });
  };

  const setMonthlyNth = (nth: number) => {
    if (!value || value.type !== 'monthly') return;
    onChange({ ...value, monthlyNth: nth });
  };

  const setMonthlyWeekday = (weekday: number) => {
    if (!value || value.type !== 'monthly') return;
    onChange({ ...value, monthlyWeekday: weekday });
  };

  const modeOptions: { key: ModeType; label: string }[] = [
    { key: 'none', label: '반복 안 함' },
    { key: 'weekly', label: '매주' },
    { key: 'monthly', label: '매월' },
  ];

  return (
    <div>
      {/* Mode selection */}
      <div style={{ margin: '0 20px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${adaptive.grey200}` }}>
        {modeOptions.map(option => {
          const selected = mode === option.key;
          return (
            <ListRow
              key={option.key}
              onClick={() => handleModeChange(option.key)}
              withTouchEffect
              border="none"
              horizontalPadding="small"
              left={
                <Checkbox.Circle
                  inputType="radio"
                  checked={selected}
                  onCheckedChange={() => handleModeChange(option.key)}
                  size={22}
                />
              }
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={option.label}
                  topProps={{ color: selected ? adaptive.blue500 : adaptive.grey900, fontWeight: selected ? 'bold' : 'medium' }}
                  bottom=" "
                />
              }
              style={{
                backgroundColor: selected ? adaptive.blue50 : '#fff',
                borderBottom: `1px solid ${adaptive.grey100}`,
              }}
            />
          );
        })}
      </div>

      {/* Weekly: day chips */}
      {mode === 'weekly' && (
        <>
          <Spacing size={12} />
          <div style={{ padding: '0 20px' }}>
            <Text typography="t7" color={adaptive.grey500}>반복할 요일을 선택하세요</Text>
            <Spacing size={8} />
            <div style={{ display: 'flex', gap: '6px' }}>
              {WEEKDAY_LABELS.map((label, idx) => {
                const selected = value?.days.includes(idx) ?? false;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: '10px',
                      border: `1.5px solid ${selected ? adaptive.blue500 : adaptive.grey200}`,
                      backgroundColor: selected ? adaptive.blue50 : '#fff',
                      color: selected ? adaptive.blue500 : adaptive.grey700,
                      fontSize: '14px',
                      fontWeight: selected ? 700 : 500,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Monthly: nth + weekday */}
      {mode === 'monthly' && (
        <>
          <Spacing size={12} />
          <div style={{ padding: '0 20px' }}>
            <Text typography="t7" color={adaptive.grey500}>매월 반복할 주차와 요일을 선택하세요</Text>
            <Spacing size={8} />

            {/* Nth selector */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {NTH_LABELS.map((label, idx) => {
                const nth = idx + 1;
                const selected = value?.monthlyNth === nth;
                return (
                  <button
                    key={nth}
                    type="button"
                    onClick={() => setMonthlyNth(nth)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: '10px',
                      border: `1.5px solid ${selected ? adaptive.blue500 : adaptive.grey200}`,
                      backgroundColor: selected ? adaptive.blue50 : '#fff',
                      color: selected ? adaptive.blue500 : adaptive.grey700,
                      fontSize: '14px',
                      fontWeight: selected ? 700 : 500,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Weekday selector */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {WEEKDAY_LABELS.map((label, idx) => {
                const selected = value?.monthlyWeekday === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMonthlyWeekday(idx)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: '10px',
                      border: `1.5px solid ${selected ? adaptive.blue500 : adaptive.grey200}`,
                      backgroundColor: selected ? adaptive.blue50 : '#fff',
                      color: selected ? adaptive.blue500 : adaptive.grey700,
                      fontSize: '14px',
                      fontWeight: selected ? 700 : 500,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/RecurrencePicker.tsx
git commit -m "feat: add RecurrencePicker component with weekly/monthly modes"
```

---

### Task 7: ChoreCreate — Recurrence Integration

**Files:**
- Modify: `src/pages/ChoreCreate/ChoreCreate.tsx`

- [ ] **Step 1: Add recurrence state and imports**

In `src/pages/ChoreCreate/ChoreCreate.tsx`, add imports (after line 3):

```typescript
import RecurrencePicker, { type RecurrenceValue } from '../../components/RecurrencePicker';
import { createChoreTemplate } from '../../data/choreTemplates';
```

Add state after `error` state (after line 18):

```typescript
  const [recurrence, setRecurrence] = useState<RecurrenceValue | null>(null);
```

- [ ] **Step 2: Modify handleSubmit to handle recurrence**

Replace the existing `handleSubmit` (lines 42-64) with:

```typescript
  const handleSubmit = async () => {
    if (!title.trim() || !user.couple_id) return;
    setLoading(true);
    setError(null);
    try {
      if (recurrence) {
        // Create template (recurring)
        await createChoreTemplate({
          couple_id: user.couple_id,
          title: title.trim(),
          created_by_id: user.id,
          assignee_id: assigneeId,
          recurrence_type: recurrence.type,
          recurrence_days: recurrence.days,
          monthly_nth: recurrence.monthlyNth,
          monthly_weekday: recurrence.monthlyWeekday,
          proposed_reward_type: proposedReward?.type,
          proposed_reward_key: proposedReward?.key,
          proposed_reward_text: proposedReward?.text,
        });
      } else {
        // Create single chore (existing logic)
        const chore = await createChore({
          couple_id: user.couple_id,
          title: title.trim(),
          created_by_id: user.id,
          assignee_id: assigneeId,
          due_date: dueDate || undefined,
          proposed_reward_type: proposedReward?.type,
          proposed_reward_key: proposedReward?.key,
          proposed_reward_text: proposedReward?.text,
        });
        dispatch({ type: 'ADD_CHORE', payload: chore });
      }
      navigate('/home');
    } catch {
      setError('할 일을 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 3: Add RecurrencePicker section to JSX**

Insert the recurrence section between the reward section and the due date section. Replace the block from `<Spacing size={8} />` (line 160) through the end of the due date section (line 194) with:

```tsx
      <Spacing size={8} />

      {/* 반복 설정 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            반복 설정
          </ListHeader.TitleParagraph>
        }
        description={
          <ListHeader.DescriptionParagraph>선택사항</ListHeader.DescriptionParagraph>
        }
        descriptionPosition="bottom"
      />
      <RecurrencePicker value={recurrence} onChange={setRecurrence} />

      {/* 마감일 — 반복 설정 시 숨김 */}
      {!recurrence && (
        <>
          <Spacing size={8} />
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
                마감일
              </ListHeader.TitleParagraph>
            }
            description={
              <ListHeader.DescriptionParagraph>선택사항</ListHeader.DescriptionParagraph>
            }
            descriptionPosition="bottom"
          />
          <div style={{ padding: '0 20px' }}>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                border: `1.5px solid ${adaptive.grey200}`, fontSize: '15px', outline: 'none',
                boxSizing: 'border-box', backgroundColor: '#fff',
                color: dueDate ? adaptive.grey900 : adaptive.grey400,
              }}
            />
            {dueDate && (
              <>
                <Spacing size={8} />
                <Button size="small" color="light" variant="weak" onClick={() => setDueDate('')}>
                  마감일 삭제
                </Button>
              </>
            )}
          </div>
        </>
      )}
```

- [ ] **Step 4: Update submit button label**

Replace the submit button text (line 203):

```tsx
          {recurrence ? '반복 등록하기' : '등록하기'}
```

- [ ] **Step 5: Update submit validation for recurrence**

In the button's `disabled` prop, add recurrence validation:

```tsx
        disabled={loading || !title.trim() || (recurrence?.type === 'weekly' && recurrence.days.length === 0)}
```

- [ ] **Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/ChoreCreate/ChoreCreate.tsx
git commit -m "feat: integrate RecurrencePicker into ChoreCreate page"
```

---

### Task 8: MyPage — Template Management

**Files:**
- Modify: `src/pages/MyPage/MyPage.tsx`

- [ ] **Step 1: Add template state, imports, and handlers**

Add imports at the top of `src/pages/MyPage/MyPage.tsx` (after line 3):

```typescript
import { Badge, Switch } from '@toss/tds-mobile';
```

Add imports (after line 6):

```typescript
import { getTemplatesByCouple, toggleTemplate, deleteTemplate } from '../../data/choreTemplates';
import { WEEKDAY_LABELS, NTH_LABELS } from '../../constants';
import type { Couple, ChoreTemplate } from '../../types';
```

Remove the existing `Couple` import from the types import line.

Add state after `couple` state (after line 12):

```typescript
  const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
```

Add template loading inside `loadCouple` (or create a separate loader). Modify `loadCouple` to also load templates:

```typescript
  const loadCouple = useCallback(async () => {
    if (!user?.couple_id) return;
    try {
      const [coupleData, templateData] = await Promise.all([
        getCoupleInfo(user.couple_id),
        getTemplatesByCouple(user.couple_id),
      ]);
      setCouple(coupleData);
      setTemplates(templateData);
    } catch {
      /* ignore */
    }
  }, [user?.couple_id]);
```

Add handlers before the `handleReset` function:

```typescript
  const handleToggleTemplate = async (t: ChoreTemplate) => {
    try {
      const updated = await toggleTemplate(t.id, !t.is_active);
      setTemplates(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch { /* ignore */ }
  };

  const handleDeleteTemplate = async (t: ChoreTemplate) => {
    const confirmed = await dialog.openConfirm({
      title: '반복 일정을 삭제할까요?',
      description: `'${t.title}' 반복을 삭제합니다. 이미 생성된 할 일은 유지돼요.`,
      confirmButton: '삭제',
      cancelButton: '취소',
    });
    if (!confirmed) return;
    try {
      await deleteTemplate(t.id);
      setTemplates(prev => prev.filter(item => item.id !== t.id));
    } catch { /* ignore */ }
  };
```

Add a helper function to format recurrence summary:

```typescript
  const formatRecurrence = (t: ChoreTemplate): string => {
    if (t.recurrence_type === 'weekly') {
      const days = t.recurrence_days.map(d => WEEKDAY_LABELS[d]).join('/');
      return `매주 ${days}`;
    }
    if (t.monthly_nth != null && t.monthly_weekday != null) {
      return `매월 ${NTH_LABELS[t.monthly_nth - 1]} ${WEEKDAY_LABELS[t.monthly_weekday]}`;
    }
    return '매월';
  };
```

- [ ] **Step 2: Add templates section to JSX**

Insert between the workspace section and the settings section (before the `{/* 설정 */}` comment, around line 148). Add:

```tsx
      <Spacing size={8} />

      {/* 반복 일정 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            {`반복 일정 ${templates.length}`}
          </ListHeader.TitleParagraph>
        }
      />
      {templates.length === 0 ? (
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <Text typography="t6" color={adaptive.grey400}>등록된 반복 일정이 없어요</Text>
        </div>
      ) : (
        <List>
          {templates.map(t => {
            const assigneeName = t.assignee_id === user.id ? '나' : (partner?.nickname ?? '파트너');
            return (
              <ListRow
                key={t.id}
                onClick={() => handleDeleteTemplate(t)}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={t.title}
                    topProps={{ color: t.is_active ? adaptive.grey900 : adaptive.grey400, fontWeight: 'bold' }}
                    bottom={`${formatRecurrence(t)} · ${assigneeName}`}
                    bottomProps={{ color: adaptive.grey500 }}
                  />
                }
                right={
                  <Badge
                    size="small"
                    variant="fill"
                    color={t.is_active ? 'blue' : 'elephant'}
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleToggleTemplate(t); }}
                    style={{ cursor: 'pointer' }}
                  >
                    {t.is_active ? '활성' : '비활성'}
                  </Badge>
                }
              />
            );
          })}
        </List>
      )}

      <Spacing size={8} />
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/MyPage/MyPage.tsx
git commit -m "feat: add recurring template management to MyPage"
```

---

### Task 9: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Manual test flow**

1. Go to ChoreCreate → select "매주" → pick 월/수/금 → set assignee → submit
2. Go to MyPage → verify template appears in "반복 일정" section
3. Toggle template active/inactive via Badge
4. Reload Home → verify sync generates chores with 🔁 icon
5. Go to MyPage → delete template → confirm it's removed

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: recurring chores — complete implementation"
```
