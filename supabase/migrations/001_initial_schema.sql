-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE chore_status AS ENUM (
  'draft',
  'pending',
  'in_progress',
  'help_requested',
  'reassigned',
  'completed'
);

CREATE TYPE help_request_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'expired'
);

CREATE TYPE reward_status AS ENUM (
  'pending',
  'accepted',
  'used'
);

CREATE TYPE reward_type AS ENUM (
  'template',
  'custom'
);

-- couples table (created before users to resolve circular FK)
CREATE TABLE couples (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code   TEXT NOT NULL UNIQUE,
  invite_code_expires_at TIMESTAMPTZ NOT NULL,
  user_a_id     UUID NOT NULL,
  user_b_id     UUID,
  matched_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- users table
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_user_id  TEXT NOT NULL UNIQUE,
  nickname      TEXT NOT NULL,
  couple_id     UUID REFERENCES couples(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK constraints to couples after users is created
ALTER TABLE couples
  ADD CONSTRAINT couples_user_a_id_fkey FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE couples
  ADD CONSTRAINT couples_user_b_id_fkey FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE SET NULL;

-- chores table
CREATE TABLE chores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id            UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  created_by_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status               chore_status NOT NULL DEFAULT 'draft',
  due_date             DATE NOT NULL,
  completed_by_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- help_requests table
CREATE TABLE help_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id     UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helper_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  status       help_request_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- rewards table
CREATE TABLE rewards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id     UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  giver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         reward_type NOT NULL,
  template_key TEXT,
  custom_text  TEXT,
  status       reward_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_toss_user_id    ON users(toss_user_id);
CREATE INDEX idx_users_couple_id       ON users(couple_id);
CREATE INDEX idx_couples_invite_code   ON couples(invite_code);
CREATE INDEX idx_chores_couple_id      ON chores(couple_id);
CREATE INDEX idx_chores_assignee_id    ON chores(assignee_id);
CREATE INDEX idx_chores_status         ON chores(status);
CREATE INDEX idx_help_requests_chore_id   ON help_requests(chore_id);
CREATE INDEX idx_help_requests_status     ON help_requests(status);
CREATE INDEX idx_rewards_receiver_id   ON rewards(receiver_id);
CREATE INDEX idx_rewards_chore_id      ON rewards(chore_id);

-- Row Level Security
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards       ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users
CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  USING (toss_user_id = current_setting('app.current_toss_user_id', true));

CREATE POLICY "Users can insert own row"
  ON users FOR INSERT
  WITH CHECK (toss_user_id = current_setting('app.current_toss_user_id', true));

CREATE POLICY "Users can update own row"
  ON users FOR UPDATE
  USING (toss_user_id = current_setting('app.current_toss_user_id', true));

-- Users can also read their partner (same couple_id)
CREATE POLICY "Users can read partner in same couple"
  ON users FOR SELECT
  USING (
    couple_id IS NOT NULL AND
    couple_id IN (
      SELECT couple_id FROM users
      WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
    )
  );

-- RLS Policies: couples
CREATE POLICY "Couple members can read their couple"
  ON couples FOR SELECT
  USING (
    user_a_id IN (SELECT id FROM users WHERE toss_user_id = current_setting('app.current_toss_user_id', true))
    OR
    user_b_id IN (SELECT id FROM users WHERE toss_user_id = current_setting('app.current_toss_user_id', true))
  );

CREATE POLICY "Authenticated user can create couple"
  ON couples FOR INSERT
  WITH CHECK (
    user_a_id IN (SELECT id FROM users WHERE toss_user_id = current_setting('app.current_toss_user_id', true))
  );

CREATE POLICY "Couple members can update their couple"
  ON couples FOR UPDATE
  USING (
    user_a_id IN (SELECT id FROM users WHERE toss_user_id = current_setting('app.current_toss_user_id', true))
    OR
    user_b_id IN (SELECT id FROM users WHERE toss_user_id = current_setting('app.current_toss_user_id', true))
  );

-- RLS Policies: chores
CREATE POLICY "Couple members can read their chores"
  ON chores FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM users
      WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
        AND couple_id IS NOT NULL
    )
  );

CREATE POLICY "Couple members can insert chores"
  ON chores FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM users
      WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
        AND couple_id IS NOT NULL
    )
  );

CREATE POLICY "Couple members can update chores"
  ON chores FOR UPDATE
  USING (
    couple_id IN (
      SELECT couple_id FROM users
      WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
        AND couple_id IS NOT NULL
    )
  );

-- RLS Policies: help_requests
CREATE POLICY "Couple members can read help requests"
  ON help_requests FOR SELECT
  USING (
    chore_id IN (
      SELECT id FROM chores
      WHERE couple_id IN (
        SELECT couple_id FROM users
        WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
          AND couple_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Couple members can insert help requests"
  ON help_requests FOR INSERT
  WITH CHECK (
    chore_id IN (
      SELECT id FROM chores
      WHERE couple_id IN (
        SELECT couple_id FROM users
        WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
          AND couple_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Couple members can update help requests"
  ON help_requests FOR UPDATE
  USING (
    chore_id IN (
      SELECT id FROM chores
      WHERE couple_id IN (
        SELECT couple_id FROM users
        WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
          AND couple_id IS NOT NULL
      )
    )
  );

-- RLS Policies: rewards
CREATE POLICY "Couple members can read rewards"
  ON rewards FOR SELECT
  USING (
    chore_id IN (
      SELECT id FROM chores
      WHERE couple_id IN (
        SELECT couple_id FROM users
        WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
          AND couple_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Couple members can insert rewards"
  ON rewards FOR INSERT
  WITH CHECK (
    chore_id IN (
      SELECT id FROM chores
      WHERE couple_id IN (
        SELECT couple_id FROM users
        WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
          AND couple_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Couple members can update rewards"
  ON rewards FOR UPDATE
  USING (
    chore_id IN (
      SELECT id FROM chores
      WHERE couple_id IN (
        SELECT couple_id FROM users
        WHERE toss_user_id = current_setting('app.current_toss_user_id', true)
          AND couple_id IS NOT NULL
      )
    )
  );
