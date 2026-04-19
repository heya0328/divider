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
