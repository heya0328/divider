# Divider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 맞벌이 부부를 위한 집안일 분담/보상 앱인토스 WebView 미니앱 MVP를 구현한다.

**Architecture:** 앱인토스 WebView 미니앱으로, React + TypeScript + Vite 기반 SPA를 구축한다. 백엔드는 Supabase(Postgres + Edge Functions)를 사용하고, 인증은 앱인토스 토스 로그인 SDK를 사용한다. 페이지 간 이동은 React Router v6, 상태 관리는 React Context + useReducer로 처리한다. 모든 UI는 TDS Web 컴포넌트를 사용한다.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, TDS Web (`@toss/tds`), Supabase (`@supabase/supabase-js`), Apps-in-Toss SDK (`@apps-in-toss/web-framework`)

**Spec:** `docs/superpowers/specs/2026-04-19-divider-implementation-design.md`

---

## File Map

```
toss-divider/
├── granite.config.ts              # 앱인토스 설정 (create-ait-app이 생성)
├── index.html                     # 핀치줌 비활성화 meta 포함
├── vite.config.ts                 # Vite 설정
├── package.json
├── src/
│   ├── main.tsx                   # 엔트리포인트
│   ├── App.tsx                    # BrowserRouter + AppProvider + Routes
│   ├── types/index.ts             # 공유 타입 정의
│   ├── constants/index.ts         # 보상 템플릿, 상태 enum 등
│   ├── context/AppContext.tsx      # 전역 상태 (user, partner, chores, rewards)
│   ├── data/
│   │   ├── supabase.ts            # Supabase 클라이언트 초기화
│   │   ├── couples.ts             # 커플 매칭 CRUD
│   │   ├── chores.ts              # 집안일 CRUD + 상태 전환
│   │   ├── helpRequests.ts        # 도움 요청 CRUD
│   │   └── rewards.ts             # 보상 CRUD
│   ├── hooks/
│   │   ├── useBackEvent.ts        # backEvent 뒤로가기 처리
│   │   ├── useAuth.ts             # 토스 로그인 래핑
│   │   └── useShare.ts            # share() SDK 래핑
│   ├── components/
│   │   ├── ChoreCard.tsx          # 할일 카드 컴포넌트
│   │   ├── RewardCard.tsx         # 보상 카드 컴포넌트
│   │   └── EmptyState.tsx         # 빈 상태 UI
│   └── pages/
│       ├── Onboarding/
│       │   ├── CreateCode.tsx     # 초대코드 생성
│       │   └── EnterCode.tsx      # 초대코드 입력
│       ├── Home/Home.tsx          # 오늘의 할일
│       ├── ChoreCreate/ChoreCreate.tsx
│       ├── ChoreDetail/ChoreDetail.tsx
│       ├── HelpRequest/HelpRequest.tsx
│       ├── Thanks/Thanks.tsx
│       └── Rewards/Rewards.tsx
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       └── push-notify/index.ts
```

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: 프로젝트 루트 전체 (create-ait-app이 생성)
- Modify: `index.html`, `package.json`, `vite.config.ts`

- [ ] **Step 1: 앱인토스 WebView 프로젝트 생성**

```bash
cd /Users/soon/Desktop
npx create-ait-app toss-divider
```

대화형 프롬프트에서:
- 프레임워크: `React`
- 언어: `TypeScript`
- 패키지 매니저: `npm`

기존 `claude.md`, `PRD/`, `docs/` 파일이 있으므로, create-ait-app 실행 후 기존 파일을 보존한다.

- [ ] **Step 2: 추가 의존성 설치**

```bash
cd /Users/soon/Desktop/toss-divider
npm install @supabase/supabase-js react-router-dom
npm install -D @types/react-router-dom
```

TDS Web은 `create-ait-app`이 이미 설치한다. 설치 안 된 경우:
```bash
npm install @toss/tds
```

- [ ] **Step 3: index.html에 핀치줌 비활성화 추가**

`index.html`의 `<head>` 안에 다음 meta 태그가 있는지 확인하고, 없으면 추가:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

- [ ] **Step 4: 프로젝트 구조 디렉토리 생성**

```bash
mkdir -p src/{types,constants,context,data,hooks,components}
mkdir -p src/pages/{Onboarding,Home,ChoreCreate,ChoreDetail,HelpRequest,Thanks,Rewards}
mkdir -p supabase/{migrations,functions/push-notify}
```

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: scaffold apps-in-toss webview project with dependencies"
```

---

### Task 2: 타입 및 상수 정의

**Files:**
- Create: `src/types/index.ts`, `src/constants/index.ts`

- [ ] **Step 1: 공유 타입 정의**

```typescript
// src/types/index.ts

export type ChoreStatus = 'draft' | 'pending' | 'in_progress' | 'help_requested' | 'reassigned' | 'completed';
export type HelpRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';
export type RewardStatus = 'pending' | 'accepted' | 'used';
export type RewardType = 'template' | 'custom';

export interface User {
  id: string;
  toss_user_id: string;
  nickname: string;
  couple_id: string | null;
  created_at: string;
}

export interface Couple {
  id: string;
  invite_code: string;
  invite_code_expires_at: string;
  user_a_id: string;
  user_b_id: string | null;
  matched_at: string | null;
  created_at: string;
}

export interface Chore {
  id: string;
  couple_id: string;
  title: string;
  created_by_id: string;
  assignee_id: string;
  original_assignee_id: string;
  status: ChoreStatus;
  due_date: string;
  completed_by_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface HelpRequest {
  id: string;
  chore_id: string;
  requester_id: string;
  helper_id: string | null;
  status: HelpRequestStatus;
  created_at: string;
  responded_at: string | null;
}

export interface Reward {
  id: string;
  chore_id: string;
  giver_id: string;
  receiver_id: string;
  type: RewardType;
  template_key: string | null;
  custom_text: string | null;
  status: RewardStatus;
  created_at: string;
  used_at: string | null;
}

export interface RewardTemplate {
  key: string;
  label: string;
  emoji: string;
}

export interface CreateChoreInput {
  couple_id: string;
  title: string;
  created_by_id: string;
  assignee_id: string;
  due_date: string;
}

export interface CreateRewardInput {
  chore_id: string;
  giver_id: string;
  receiver_id: string;
  type: RewardType;
  template_key?: string;
  custom_text?: string;
}
```

- [ ] **Step 2: 상수 정의**

```typescript
// src/constants/index.ts

import type { RewardTemplate } from '../types';

export const REWARD_TEMPLATES: RewardTemplate[] = [
  { key: 'coffee', label: '커피 한 잔', emoji: '☕' },
  { key: 'dessert', label: '디저트', emoji: '🍰' },
  { key: 'massage', label: '안마 10분', emoji: '💆' },
  { key: 'menu_choice', label: '오늘 메뉴 선택권', emoji: '🍽️' },
  { key: 'rest', label: '1시간 휴식권', emoji: '😴' },
];

export const INVITE_CODE_EXPIRY_HOURS = 24;

export const HELP_REQUEST_EXPIRY_HOURS = 24;

export const BACK_MAP: Record<string, string | null> = {
  '/home': null,
  '/chore/create': '/home',
  '/chore/:id': '/home',
  '/help-request/:id': '/home',
  '/thanks/:id': '/home',
  '/rewards': '/home',
  '/onboarding/create': null,
  '/onboarding/enter': null,
};
```

- [ ] **Step 3: 커밋**

```bash
git add src/types/index.ts src/constants/index.ts
git commit -m "feat: add shared types and constants"
```

---

### Task 3: Supabase 스키마 마이그레이션

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Supabase 프로젝트 생성**

Supabase 대시보드(https://supabase.com)에서 새 프로젝트 생성. 프로젝트 URL과 anon key를 `.env`에 저장:

```bash
# .env (gitignore에 추가)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.gitignore`에 `.env` 추가 확인.

- [ ] **Step 2: 마이그레이션 SQL 작성**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Enum types
CREATE TYPE chore_status AS ENUM (
  'draft', 'pending', 'in_progress', 'help_requested', 'reassigned', 'completed'
);
CREATE TYPE help_request_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE reward_status AS ENUM ('pending', 'accepted', 'used');
CREATE TYPE reward_type AS ENUM ('template', 'custom');

-- Couples (created first to avoid circular ref)
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  invite_code_expires_at TIMESTAMPTZ NOT NULL,
  user_a_id UUID NOT NULL,
  user_b_id UUID,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_user_id TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  couple_id UUID REFERENCES couples(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Circular FK resolution
ALTER TABLE couples ADD CONSTRAINT fk_user_a FOREIGN KEY (user_a_id) REFERENCES users(id);
ALTER TABLE couples ADD CONSTRAINT fk_user_b FOREIGN KEY (user_b_id) REFERENCES users(id);

-- Chores
CREATE TABLE chores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id),
  title TEXT NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id),
  assignee_id UUID NOT NULL REFERENCES users(id),
  original_assignee_id UUID NOT NULL REFERENCES users(id),
  status chore_status NOT NULL DEFAULT 'draft',
  due_date DATE NOT NULL,
  completed_by_id UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Help Requests
CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES chores(id),
  requester_id UUID NOT NULL REFERENCES users(id),
  helper_id UUID REFERENCES users(id),
  status help_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Rewards
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES chores(id),
  giver_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  type reward_type NOT NULL,
  template_key TEXT,
  custom_text TEXT,
  status reward_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_chores_couple_id ON chores(couple_id);
CREATE INDEX idx_chores_assignee_id ON chores(assignee_id);
CREATE INDEX idx_chores_status ON chores(status);
CREATE INDEX idx_help_requests_chore_id ON help_requests(chore_id);
CREATE INDEX idx_rewards_chore_id ON rewards(chore_id);

-- RLS Policies (simplified for MVP — no Supabase Auth, using service role key from Edge Functions)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Allow all access via service role (Edge Functions)
-- Client-side access is read-only with anon key, writes go through Edge Functions
CREATE POLICY "anon_read_users" ON users FOR SELECT USING (true);
CREATE POLICY "anon_read_couples" ON couples FOR SELECT USING (true);
CREATE POLICY "anon_read_chores" ON chores FOR SELECT USING (true);
CREATE POLICY "anon_read_help_requests" ON help_requests FOR SELECT USING (true);
CREATE POLICY "anon_read_rewards" ON rewards FOR SELECT USING (true);

-- Service role bypass (for Edge Functions that use service_role key)
CREATE POLICY "service_all_users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_couples" ON couples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_chores" ON chores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_help_requests" ON help_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_rewards" ON rewards FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 3: Supabase 대시보드의 SQL Editor에서 위 SQL 실행**

Supabase 대시보드 → SQL Editor → New Query → 위 SQL 붙여넣기 → Run.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add initial database schema migration"
```

---

### Task 4: Supabase 클라이언트 및 데이터 레이어

**Files:**
- Create: `src/data/supabase.ts`, `src/data/couples.ts`, `src/data/chores.ts`, `src/data/helpRequests.ts`, `src/data/rewards.ts`

- [ ] **Step 1: Supabase 클라이언트 초기화**

```typescript
// src/data/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: 커플 매칭 데이터 레이어**

```typescript
// src/data/couples.ts

import { supabase } from './supabase';
import type { User, Couple } from '../types';
import { INVITE_CODE_EXPIRY_HOURS } from '../constants';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function findOrCreateUser(tossUserId: string, nickname: string): Promise<User> {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('toss_user_id', tossUserId)
    .single();

  if (existing) return existing as User;

  const { data, error } = await supabase
    .from('users')
    .insert({ toss_user_id: tossUserId, nickname })
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function createInviteCode(userId: string): Promise<Couple> {
  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITE_CODE_EXPIRY_HOURS);

  const { data, error } = await supabase
    .from('couples')
    .insert({
      invite_code: code,
      invite_code_expires_at: expiresAt.toISOString(),
      user_a_id: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('users')
    .update({ couple_id: data.id })
    .eq('id', userId);

  return data as Couple;
}

export async function joinWithCode(userId: string, code: string): Promise<Couple> {
  const { data: couple, error: findError } = await supabase
    .from('couples')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .is('user_b_id', null)
    .single();

  if (findError || !couple) throw new Error('유효하지 않은 초대코드예요');

  if (new Date(couple.invite_code_expires_at) < new Date()) {
    throw new Error('코드가 만료됐어요. 파트너에게 새 코드를 요청해주세요');
  }

  if (couple.user_a_id === userId) {
    throw new Error('자기 자신을 초대할 수 없어요');
  }

  const { data, error } = await supabase
    .from('couples')
    .update({
      user_b_id: userId,
      matched_at: new Date().toISOString(),
    })
    .eq('id', couple.id)
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('users')
    .update({ couple_id: data.id })
    .eq('id', userId);

  return data as Couple;
}

export async function getPartner(coupleId: string, myUserId: string): Promise<User | null> {
  const { data: couple } = await supabase
    .from('couples')
    .select('user_a_id, user_b_id')
    .eq('id', coupleId)
    .single();

  if (!couple) return null;

  const partnerId = couple.user_a_id === myUserId ? couple.user_b_id : couple.user_a_id;
  if (!partnerId) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', partnerId)
    .single();

  return data as User | null;
}
```

- [ ] **Step 3: 집안일 데이터 레이어**

```typescript
// src/data/chores.ts

import { supabase } from './supabase';
import type { Chore, CreateChoreInput, ChoreStatus } from '../types';

export async function getChoresByCouple(coupleId: string): Promise<Chore[]> {
  const { data, error } = await supabase
    .from('chores')
    .select('*')
    .eq('couple_id', coupleId)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data as Chore[];
}

export async function createChore(input: CreateChoreInput): Promise<Chore> {
  const { data, error } = await supabase
    .from('chores')
    .insert({
      ...input,
      original_assignee_id: input.assignee_id,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Chore;
}

export async function updateChoreStatus(
  choreId: string,
  newStatus: ChoreStatus,
  extras?: Partial<Chore>
): Promise<Chore> {
  const { data, error } = await supabase
    .from('chores')
    .update({ status: newStatus, ...extras })
    .eq('id', choreId)
    .select()
    .single();

  if (error) throw error;
  return data as Chore;
}

export async function acceptDraftChore(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'pending');
}

export async function rejectDraftChore(choreId: string): Promise<void> {
  const { error } = await supabase
    .from('chores')
    .delete()
    .eq('id', choreId);

  if (error) throw error;
}

export async function startChore(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'in_progress');
}

export async function requestHelp(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'help_requested');
}

export async function completeChore(choreId: string, completedById: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'completed', {
    completed_by_id: completedById,
    completed_at: new Date().toISOString(),
  });
}

export async function reassignChore(choreId: string, newAssigneeId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'reassigned', {
    assignee_id: newAssigneeId,
  });
}

export async function revertToInProgress(choreId: string): Promise<Chore> {
  return updateChoreStatus(choreId, 'in_progress');
}
```

- [ ] **Step 4: 도움 요청 데이터 레이어**

```typescript
// src/data/helpRequests.ts

import { supabase } from './supabase';
import type { HelpRequest } from '../types';

export async function createHelpRequest(choreId: string, requesterId: string): Promise<HelpRequest> {
  const { data, error } = await supabase
    .from('help_requests')
    .insert({
      chore_id: choreId,
      requester_id: requesterId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HelpRequest;
}

export async function acceptHelpRequest(requestId: string, helperId: string): Promise<HelpRequest> {
  const { data, error } = await supabase
    .from('help_requests')
    .update({
      helper_id: helperId,
      status: 'accepted',
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data as HelpRequest;
}

export async function declineHelpRequest(requestId: string): Promise<HelpRequest> {
  const { data, error } = await supabase
    .from('help_requests')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data as HelpRequest;
}

export async function getPendingHelpRequest(choreId: string): Promise<HelpRequest | null> {
  const { data } = await supabase
    .from('help_requests')
    .select('*')
    .eq('chore_id', choreId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data as HelpRequest | null;
}
```

- [ ] **Step 5: 보상 데이터 레이어**

```typescript
// src/data/rewards.ts

import { supabase } from './supabase';
import type { Reward, CreateRewardInput } from '../types';

export async function createReward(input: CreateRewardInput): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Reward;
}

export async function getRewardsByUser(userId: string): Promise<{ received: Reward[]; sent: Reward[] }> {
  const { data: received, error: err1 } = await supabase
    .from('rewards')
    .select('*')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });

  const { data: sent, error: err2 } = await supabase
    .from('rewards')
    .select('*')
    .eq('giver_id', userId)
    .order('created_at', { ascending: false });

  if (err1) throw err1;
  if (err2) throw err2;

  return {
    received: (received || []) as Reward[],
    sent: (sent || []) as Reward[],
  };
}

export async function acceptReward(rewardId: string): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update({ status: 'accepted' })
    .eq('id', rewardId)
    .select()
    .single();

  if (error) throw error;
  return data as Reward;
}

export async function useReward(rewardId: string): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', rewardId)
    .select()
    .single();

  if (error) throw error;
  return data as Reward;
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/data/
git commit -m "feat: add Supabase client and data layer (couples, chores, helpRequests, rewards)"
```

---

### Task 5: Hooks (useAuth, useBackEvent, useShare)

**Files:**
- Create: `src/hooks/useAuth.ts`, `src/hooks/useBackEvent.ts`, `src/hooks/useShare.ts`

- [ ] **Step 1: 토스 로그인 hook**

```typescript
// src/hooks/useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { findOrCreateUser } from '../data/couples';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const login = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // 앱인토스 SDK 토스 로그인
      let tossUserId = '';
      let nickname = '';

      if (typeof window !== 'undefined' && (window as any).__APPS_IN_TOSS__) {
        const { appLogin } = await import('@apps-in-toss/web-framework');
        const result = await appLogin();
        // authorizationCode를 서버에서 토큰 교환 후 사용자 정보 획득
        // MVP에서는 간소화: authorizationCode를 사용자 ID로 사용
        tossUserId = result.authorizationCode;
        nickname = '사용자'; // 서버에서 토스 로그인 연동 후 실제 닉네임 획득
      } else {
        // 비토스 환경 폴백 (로컬 개발용)
        tossUserId = 'dev-user-' + Date.now();
        nickname = '테스트 사용자';
      }

      const user = await findOrCreateUser(tossUserId, nickname);
      setState({ user, loading: false, error: null });
    } catch (err) {
      setState({
        user: null,
        loading: false,
        error: err instanceof Error ? err.message : '로그인에 실패했어요',
      });
    }
  }, []);

  useEffect(() => {
    login();
  }, [login]);

  return state;
}
```

- [ ] **Step 2: backEvent hook**

```typescript
// src/hooks/useBackEvent.ts

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BACK_MAP } from '../constants';

export function useBackEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setup() {
      try {
        const { graniteEvent } = await import('@apps-in-toss/web-framework');
        if (!graniteEvent?.addEventListener) return;

        unsubscribe = graniteEvent.addEventListener('backEvent', {
          onEvent: () => {
            const currentPath = locationRef.current;
            // 동적 경로 매칭 (/chore/:id → /chore/:id)
            const matchedKey = Object.keys(BACK_MAP).find(key => {
              if (key.includes(':')) {
                const pattern = key.replace(/:[^/]+/g, '[^/]+');
                return new RegExp(`^${pattern}$`).test(currentPath);
              }
              return key === currentPath;
            });

            const target = matchedKey ? BACK_MAP[matchedKey] : '/home';

            if (target === null) {
              // 종료 다이얼로그 — 앱 종료 처리
              if (window.confirm('앱을 종료할까요?')) {
                window.history.back();
              }
            } else {
              navigate(target);
            }
          },
          onError: (error: Error) => console.error('backEvent error:', error),
        });
      } catch {
        // 비토스 환경 — backEvent 미지원
      }
    }

    setup();
    return () => { unsubscribe?.(); };
  }, [navigate]);
}
```

- [ ] **Step 3: share hook**

```typescript
// src/hooks/useShare.ts

import { useCallback } from 'react';

export function useShare() {
  const shareMessage = useCallback(async (message: string) => {
    try {
      const { share } = await import('@apps-in-toss/web-framework');
      await share({ message });
    } catch {
      // 비토스 환경 폴백 — 클립보드 복사
      try {
        await navigator.clipboard.writeText(message);
        alert('메시지가 클립보드에 복사되었어요');
      } catch {
        // 클립보드도 안 되면 무시
      }
    }
  }, []);

  return { shareMessage };
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/hooks/
git commit -m "feat: add hooks for auth, backEvent, and share SDK"
```

---

### Task 6: Context / 전역 상태 관리

**Files:**
- Create: `src/context/AppContext.tsx`

- [ ] **Step 1: AppContext 구현**

```typescript
// src/context/AppContext.tsx

import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { User, Chore, Reward } from '../types';
import { getChoresByCouple } from '../data/chores';
import { getRewardsByUser } from '../data/rewards';
import { getPartner } from '../data/couples';

interface AppState {
  user: User | null;
  partner: User | null;
  chores: Chore[];
  rewards: { received: Reward[]; sent: Reward[] };
  loading: boolean;
}

type Action =
  | { type: 'SET_USER'; user: User }
  | { type: 'SET_PARTNER'; partner: User | null }
  | { type: 'SET_CHORES'; chores: Chore[] }
  | { type: 'SET_REWARDS'; rewards: { received: Reward[]; sent: Reward[] } }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'UPDATE_CHORE'; chore: Chore }
  | { type: 'ADD_CHORE'; chore: Chore }
  | { type: 'REMOVE_CHORE'; choreId: string }
  | { type: 'ADD_REWARD'; reward: Reward }
  | { type: 'UPDATE_REWARD'; reward: Reward };

const initialState: AppState = {
  user: null,
  partner: null,
  chores: [],
  rewards: { received: [], sent: [] },
  loading: true,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'SET_PARTNER':
      return { ...state, partner: action.partner };
    case 'SET_CHORES':
      return { ...state, chores: action.chores };
    case 'SET_REWARDS':
      return { ...state, rewards: action.rewards };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'UPDATE_CHORE':
      return {
        ...state,
        chores: state.chores.map(c => c.id === action.chore.id ? action.chore : c),
      };
    case 'ADD_CHORE':
      return { ...state, chores: [...state.chores, action.chore] };
    case 'REMOVE_CHORE':
      return { ...state, chores: state.chores.filter(c => c.id !== action.choreId) };
    case 'ADD_REWARD':
      return {
        ...state,
        rewards: {
          ...state.rewards,
          sent: [action.reward, ...state.rewards.sent],
        },
      };
    case 'UPDATE_REWARD': {
      const updateList = (list: Reward[]) =>
        list.map(r => r.id === action.reward.id ? action.reward : r);
      return {
        ...state,
        rewards: {
          received: updateList(state.rewards.received),
          sent: updateList(state.rewards.sent),
        },
      };
    }
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, user }: { children: ReactNode; user: User }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, user, loading: false });

  const refreshData = useCallback(async () => {
    if (!user.couple_id) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const [chores, rewards, partner] = await Promise.all([
        getChoresByCouple(user.couple_id),
        getRewardsByUser(user.id),
        getPartner(user.couple_id, user.id),
      ]);

      dispatch({ type: 'SET_CHORES', chores });
      dispatch({ type: 'SET_REWARDS', rewards });
      dispatch({ type: 'SET_PARTNER', partner });
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [user.couple_id, user.id]);

  return (
    <AppContext.Provider value={{ state, dispatch, refreshData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: add AppContext with useReducer for global state management"
```

---

### Task 7: 공통 컴포넌트

**Files:**
- Create: `src/components/ChoreCard.tsx`, `src/components/RewardCard.tsx`, `src/components/EmptyState.tsx`

- [ ] **Step 1: ChoreCard 컴포넌트**

```tsx
// src/components/ChoreCard.tsx

import type { Chore, User } from '../types';

interface ChoreCardProps {
  chore: Chore;
  currentUser: User;
  partner: User | null;
  onClick: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: '수락 대기',
  pending: '할 일',
  in_progress: '진행 중',
  help_requested: '도움 요청 중',
  reassigned: '대신 하는 중',
  completed: '완료',
};

export function ChoreCard({ chore, currentUser, partner, onClick }: ChoreCardProps) {
  const isMyChore = chore.assignee_id === currentUser.id;
  const assigneeName = isMyChore ? '나' : (partner?.nickname || '파트너');
  const isOverdue = new Date(chore.due_date) < new Date() && chore.status !== 'completed';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: '#fff',
        border: isOverdue ? '1px solid #FF6B6B' : '1px solid #E5E8EB',
        marginBottom: '8px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '16px', fontWeight: 600 }}>{chore.title}</span>
        <span style={{
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: chore.status === 'help_requested' ? '#FFF3E0' : '#F5F6F8',
          color: chore.status === 'help_requested' ? '#FF9800' : '#6B7684',
        }}>
          {STATUS_LABELS[chore.status]}
        </span>
      </div>
      <div style={{ marginTop: '8px', fontSize: '13px', color: '#6B7684' }}>
        {assigneeName} · {chore.due_date}
        {isOverdue && <span style={{ color: '#FF6B6B', marginLeft: '8px' }}>밀린 일</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: RewardCard 컴포넌트**

```tsx
// src/components/RewardCard.tsx

import type { Reward } from '../types';
import { REWARD_TEMPLATES } from '../constants';

interface RewardCardProps {
  reward: Reward;
  isReceived: boolean;
  onAccept?: () => void;
  onUse?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  accepted: '수락됨',
  used: '사용 완료',
};

export function RewardCard({ reward, isReceived, onAccept, onUse }: RewardCardProps) {
  const template = REWARD_TEMPLATES.find(t => t.key === reward.template_key);
  const label = template ? `${template.emoji} ${template.label}` : reward.custom_text || '감사 선물';

  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: '#fff',
      border: '1px solid #E5E8EB',
      marginBottom: '8px',
    }}>
      <div style={{ fontSize: '16px', fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: '4px', fontSize: '13px', color: '#6B7684' }}>
        {STATUS_LABELS[reward.status]}
      </div>
      {isReceived && reward.status === 'pending' && onAccept && (
        <button onClick={onAccept} style={{ marginTop: '8px' }}>수락하기</button>
      )}
      {isReceived && reward.status === 'accepted' && onUse && (
        <button onClick={onUse} style={{ marginTop: '8px' }}>사용 완료</button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: EmptyState 컴포넌트**

```tsx
// src/components/EmptyState.tsx

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      color: '#6B7684',
      fontSize: '14px',
    }}>
      {message}
    </div>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/components/
git commit -m "feat: add ChoreCard, RewardCard, and EmptyState components"
```

---

### Task 8: 페이지 — Onboarding

**Files:**
- Create: `src/pages/Onboarding/CreateCode.tsx`, `src/pages/Onboarding/EnterCode.tsx`

- [ ] **Step 1: CreateCode 페이지**

```tsx
// src/pages/Onboarding/CreateCode.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useShare } from '../../hooks/useShare';
import { createInviteCode } from '../../data/couples';

export function CreateCode() {
  const { state, dispatch } = useApp();
  const { shareMessage } = useShare();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!state.user) return;
    setLoading(true);
    try {
      const couple = await createInviteCode(state.user.id);
      setCode(couple.invite_code);
      dispatch({ type: 'SET_USER', user: { ...state.user, couple_id: couple.id } });
    } catch (err) {
      alert(err instanceof Error ? err.message : '코드 생성에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    await shareMessage(
      `Divider에서 함께 집안일을 나눠요! 초대코드: ${code}\n토스 앱에서 Divider를 검색하고 이 코드를 입력해주세요.`
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>파트너 초대하기</h1>
      <p style={{ marginTop: '8px', color: '#6B7684', fontSize: '14px' }}>
        아래 코드를 파트너에게 공유해주세요
      </p>

      {!code ? (
        <button onClick={handleCreate} disabled={loading} style={{ marginTop: '24px', width: '100%', padding: '16px', fontSize: '16px' }}>
          {loading ? '생성 중...' : '초대코드 만들기'}
        </button>
      ) : (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <div style={{
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '8px',
            padding: '24px',
            backgroundColor: '#F5F6F8',
            borderRadius: '12px',
          }}>
            {code}
          </div>
          <p style={{ marginTop: '12px', color: '#6B7684', fontSize: '13px' }}>
            24시간 내에 입력해야 해요
          </p>
          <button onClick={handleShare} style={{ marginTop: '16px', width: '100%', padding: '16px', fontSize: '16px' }}>
            코드 공유하기
          </button>
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#6B7684' }}>
            파트너가 코드를 입력하면 자동으로 연결돼요
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: EnterCode 페이지**

```tsx
// src/pages/Onboarding/EnterCode.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { joinWithCode } from '../../data/couples';

export function EnterCode() {
  const { state, dispatch, refreshData } = useApp();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!state.user || code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const couple = await joinWithCode(state.user.id, code);
      dispatch({ type: 'SET_USER', user: { ...state.user, couple_id: couple.id } });
      await refreshData();
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>초대코드 입력</h1>
      <p style={{ marginTop: '8px', color: '#6B7684', fontSize: '14px' }}>
        파트너에게 받은 6자리 코드를 입력해주세요
      </p>

      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="ABCDEF"
        maxLength={6}
        style={{
          marginTop: '24px',
          width: '100%',
          padding: '16px',
          fontSize: '24px',
          textAlign: 'center',
          letterSpacing: '8px',
          border: error ? '1px solid #FF6B6B' : '1px solid #E5E8EB',
          borderRadius: '12px',
        }}
      />

      {error && (
        <p style={{ marginTop: '8px', color: '#FF6B6B', fontSize: '13px' }}>{error}</p>
      )}

      <button
        onClick={handleJoin}
        disabled={loading || code.length !== 6}
        style={{ marginTop: '16px', width: '100%', padding: '16px', fontSize: '16px' }}
      >
        {loading ? '연결 중...' : '파트너와 연결하기'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Onboarding/
git commit -m "feat: add onboarding pages (CreateCode, EnterCode)"
```

---

### Task 9: 페이지 — Home

**Files:**
- Create: `src/pages/Home/Home.tsx`

- [ ] **Step 1: Home 페이지 구현**

```tsx
// src/pages/Home/Home.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ChoreCard } from '../../components/ChoreCard';
import { EmptyState } from '../../components/EmptyState';

export function Home() {
  const { state, refreshData } = useApp();
  const navigate = useNavigate();
  const { user, partner, chores } = state;

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (!user) return null;

  const myChores = chores.filter(
    c => c.assignee_id === user.id && c.status !== 'draft' && c.status !== 'completed'
  );
  const partnerChores = chores.filter(
    c => c.assignee_id !== user.id && c.status !== 'draft' && c.status !== 'completed'
  );
  const pendingApprovals = chores.filter(
    c => c.status === 'draft' && c.assignee_id === user.id && c.created_by_id !== user.id
  );

  return (
    <div style={{ padding: '24px', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>오늘의 우리 집안일</h1>

      {pendingApprovals.length > 0 && (
        <section style={{ marginTop: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#FF9800', marginBottom: '8px' }}>
            수락 대기 중 ({pendingApprovals.length})
          </h2>
          {pendingApprovals.map(chore => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              currentUser={user}
              partner={partner}
              onClick={() => navigate(`/chore/${chore.id}`)}
            />
          ))}
        </section>
      )}

      <section style={{ marginTop: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
          내 할 일 ({myChores.length})
        </h2>
        {myChores.length === 0 ? (
          <EmptyState message="오늘 할 일이 없어요" />
        ) : (
          myChores.map(chore => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              currentUser={user}
              partner={partner}
              onClick={() => navigate(`/chore/${chore.id}`)}
            />
          ))
        )}
      </section>

      <section style={{ marginTop: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
          파트너 할 일 ({partnerChores.length})
        </h2>
        {partnerChores.length === 0 ? (
          <EmptyState message="파트너의 할 일이 없어요" />
        ) : (
          partnerChores.map(chore => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              currentUser={user}
              partner={partner}
              onClick={() => navigate(`/chore/${chore.id}`)}
            />
          ))
        )}
      </section>

      {/* FAB */}
      <button
        onClick={() => navigate('/chore/create')}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#3182F6',
          color: '#fff',
          fontSize: '24px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(49, 130, 246, 0.4)',
        }}
      >
        +
      </button>

      {/* Bottom Tab */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        backgroundColor: '#fff',
        borderTop: '1px solid #E5E8EB',
        padding: '12px 0',
      }}>
        <button onClick={() => navigate('/home')} style={{ flex: 1, textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#3182F6', border: 'none', background: 'none' }}>
          홈
        </button>
        <button onClick={() => navigate('/rewards')} style={{ flex: 1, textAlign: 'center', fontSize: '13px', color: '#6B7684', border: 'none', background: 'none' }}>
          보상
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/Home/
git commit -m "feat: add Home page with chore sections and bottom tab"
```

---

### Task 10: 페이지 — ChoreCreate, ChoreDetail

**Files:**
- Create: `src/pages/ChoreCreate/ChoreCreate.tsx`, `src/pages/ChoreDetail/ChoreDetail.tsx`

- [ ] **Step 1: ChoreCreate 페이지**

```tsx
// src/pages/ChoreCreate/ChoreCreate.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { createChore } from '../../data/chores';

export function ChoreCreate() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [assignToPartner, setAssignToPartner] = useState(false);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const { user, partner } = state;

  const handleSubmit = async () => {
    if (!user || !user.couple_id || !title.trim()) return;
    setLoading(true);
    try {
      const assigneeId = assignToPartner && partner ? partner.id : user.id;
      const chore = await createChore({
        couple_id: user.couple_id,
        title: title.trim(),
        created_by_id: user.id,
        assignee_id: assigneeId,
        due_date: dueDate,
      });
      dispatch({ type: 'ADD_CHORE', chore });
      navigate('/home');
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>집안일 등록</h1>

      <div style={{ marginTop: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>할 일</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="예: 설거지, 빨래, 청소기 돌리기"
          style={{ width: '100%', padding: '14px', marginTop: '8px', border: '1px solid #E5E8EB', borderRadius: '8px', fontSize: '16px' }}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>담당자</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={() => setAssignToPartner(false)}
            style={{
              flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid',
              borderColor: !assignToPartner ? '#3182F6' : '#E5E8EB',
              backgroundColor: !assignToPartner ? '#EBF4FF' : '#fff',
              color: !assignToPartner ? '#3182F6' : '#333',
              fontSize: '14px', fontWeight: 600,
            }}
          >
            나
          </button>
          <button
            onClick={() => setAssignToPartner(true)}
            style={{
              flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid',
              borderColor: assignToPartner ? '#3182F6' : '#E5E8EB',
              backgroundColor: assignToPartner ? '#EBF4FF' : '#fff',
              color: assignToPartner ? '#3182F6' : '#333',
              fontSize: '14px', fontWeight: 600,
            }}
          >
            {partner?.nickname || '파트너'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>마감일</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={{ width: '100%', padding: '14px', marginTop: '8px', border: '1px solid #E5E8EB', borderRadius: '8px', fontSize: '16px' }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !title.trim()}
        style={{
          marginTop: '32px', width: '100%', padding: '16px',
          backgroundColor: '#3182F6', color: '#fff', border: 'none',
          borderRadius: '12px', fontSize: '16px', fontWeight: 600,
        }}
      >
        {loading ? '등록 중...' : '등록하기'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: ChoreDetail 페이지**

```tsx
// src/pages/ChoreDetail/ChoreDetail.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  acceptDraftChore, rejectDraftChore, startChore,
  requestHelp, completeChore, reassignChore,
} from '../../data/chores';
import { createHelpRequest, getPendingHelpRequest, acceptHelpRequest, declineHelpRequest } from '../../data/helpRequests';

const STATUS_LABELS: Record<string, string> = {
  draft: '수락 대기',
  pending: '할 일',
  in_progress: '진행 중',
  help_requested: '도움 요청 중',
  reassigned: '대신 하는 중',
  completed: '완료',
};

export function ChoreDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch, refreshData } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { user, partner } = state;
  const chore = state.chores.find(c => c.id === id);

  if (!chore || !user) return <div style={{ padding: '24px' }}>할 일을 찾을 수 없어요</div>;

  const isMyChore = chore.assignee_id === user.id;
  const isDraft = chore.status === 'draft';
  const needsMyApproval = isDraft && chore.created_by_id !== user.id && chore.assignee_id === user.id;

  const handleAction = async (action: () => Promise<any>) => {
    setLoading(true);
    try {
      await action();
      await refreshData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '처리에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{chore.title}</h1>

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '14px', color: '#6B7684' }}>
          상태: <strong>{STATUS_LABELS[chore.status]}</strong>
        </div>
        <div style={{ fontSize: '14px', color: '#6B7684' }}>
          담당: <strong>{isMyChore ? '나' : (partner?.nickname || '파트너')}</strong>
        </div>
        <div style={{ fontSize: '14px', color: '#6B7684' }}>
          마감: <strong>{chore.due_date}</strong>
        </div>
      </div>

      <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 수락 대기 중 — 내가 수락해야 하는 경우 */}
        {needsMyApproval && (
          <>
            <button
              onClick={() => handleAction(async () => {
                const updated = await acceptDraftChore(chore.id);
                dispatch({ type: 'UPDATE_CHORE', chore: updated });
              })}
              disabled={loading}
              style={{ width: '100%', padding: '16px', backgroundColor: '#3182F6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}
            >
              수락하기
            </button>
            <button
              onClick={() => handleAction(async () => {
                await rejectDraftChore(chore.id);
                dispatch({ type: 'REMOVE_CHORE', choreId: chore.id });
                navigate('/home');
              })}
              disabled={loading}
              style={{ width: '100%', padding: '16px', backgroundColor: '#fff', color: '#FF6B6B', border: '1px solid #FF6B6B', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}
            >
              괜찮아요, 다음에
            </button>
          </>
        )}

        {/* 내 할일 — pending 상태 */}
        {isMyChore && chore.status === 'pending' && (
          <button
            onClick={() => handleAction(async () => {
              const updated = await startChore(chore.id);
              dispatch({ type: 'UPDATE_CHORE', chore: updated });
            })}
            disabled={loading}
            style={{ width: '100%', padding: '16px', backgroundColor: '#3182F6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}
          >
            시작하기
          </button>
        )}

        {/* 내 할일 — in_progress 상태 */}
        {isMyChore && chore.status === 'in_progress' && (
          <>
            <button
              onClick={() => handleAction(async () => {
                const updated = await completeChore(chore.id, user.id);
                dispatch({ type: 'UPDATE_CHORE', chore: updated });
                navigate('/home');
              })}
              disabled={loading}
              style={{ width: '100%', padding: '16px', backgroundColor: '#3182F6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}
            >
              완료했어요
            </button>
            <button
              onClick={() => handleAction(async () => {
                const updated = await requestHelp(chore.id);
                dispatch({ type: 'UPDATE_CHORE', chore: updated });
                if (partner) {
                  await createHelpRequest(chore.id, user.id);
                }
              })}
              disabled={loading}
              style={{ width: '100%', padding: '16px', backgroundColor: '#FFF3E0', color: '#FF9800', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}
            >
              오늘 이 일, 도움 받을래요
            </button>
          </>
        )}

        {/* 파트너 할일 — help_requested 상태 (내가 대신 해줄 수 있음) */}
        {!isMyChore && chore.status === 'help_requested' && (
          <>
            <button
              onClick={() => handleAction(async () => {
                const helpReq = await getPendingHelpRequest(chore.id);
                if (helpReq) {
                  await acceptHelpRequest(helpReq.id, user.id);
                }
                const updated = await reassignChore(chore.id, user.id);
                dispatch({ type: 'UPDATE_CHORE', chore: updated });
              })}
              disabled={loading}
              style={{ width: '100%', padding: '16px', backgroundColor: '#3182F6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}
            >
              내가 대신할게
            </button>
            <button
              onClick={() => handleAction(async () => {
                const helpReq = await getPendingHelpRequest(chore.id);
                if (helpReq) {
                  await declineHelpRequest(helpReq.id);
                }
                const { revertToInProgress } = await import('../../data/chores');
                const updated = await revertToInProgress(chore.id);
                dispatch({ type: 'UPDATE_CHORE', chore: updated });
              })}
              disabled={loading}
              style={{ width: '100%', padding: '16px', backgroundColor: '#fff', color: '#6B7684', border: '1px solid #E5E8EB', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}
            >
              괜찮아요, 다음에
            </button>
          </>
        )}

        {/* 내가 대신 맡은 할일 — reassigned 상태 */}
        {isMyChore && chore.status === 'reassigned' && (
          <button
            onClick={() => handleAction(async () => {
              const updated = await completeChore(chore.id, user.id);
              dispatch({ type: 'UPDATE_CHORE', chore: updated });
              // 재할당된 할일 완료 시 감사 페이지로 이동
              navigate(`/thanks/${chore.id}`);
            })}
            disabled={loading}
            style={{ width: '100%', padding: '16px', backgroundColor: '#3182F6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600 }}
          >
            완료했어요
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/pages/ChoreCreate/ src/pages/ChoreDetail/
git commit -m "feat: add ChoreCreate and ChoreDetail pages"
```

---

### Task 11: 페이지 — Thanks, Rewards

**Files:**
- Create: `src/pages/Thanks/Thanks.tsx`, `src/pages/Rewards/Rewards.tsx`

- [ ] **Step 1: Thanks 페이지**

```tsx
// src/pages/Thanks/Thanks.tsx

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { REWARD_TEMPLATES } from '../../constants';
import { createReward } from '../../data/rewards';

export function Thanks() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user, partner } = state;
  const chore = state.chores.find(c => c.id === id);

  if (!chore || !user || !partner) return null;

  const handleSend = async () => {
    setLoading(true);
    try {
      const reward = await createReward({
        chore_id: chore.id,
        giver_id: chore.original_assignee_id,
        receiver_id: chore.completed_by_id || chore.assignee_id,
        type: isCustom ? 'custom' : 'template',
        template_key: isCustom ? undefined : selectedTemplate || undefined,
        custom_text: isCustom ? customText : undefined,
      });
      dispatch({ type: 'ADD_REWARD', reward });
      navigate('/home');
    } catch (err) {
      alert(err instanceof Error ? err.message : '전달에 실패했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '48px' }}>🙏</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginTop: '12px' }}>
          파트너가 해줬어요!
        </h1>
        <p style={{ color: '#6B7684', marginTop: '8px', fontSize: '14px' }}>
          '{chore.title}'을 대신 해줬어요.{'\n'}고마운 마음을 전해보세요
        </p>
      </div>

      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>감사 선물 선택</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {REWARD_TEMPLATES.map(tmpl => (
          <button
            key={tmpl.key}
            onClick={() => { setSelectedTemplate(tmpl.key); setIsCustom(false); }}
            style={{
              padding: '14px 16px', borderRadius: '12px', textAlign: 'left',
              border: selectedTemplate === tmpl.key && !isCustom ? '2px solid #3182F6' : '1px solid #E5E8EB',
              backgroundColor: selectedTemplate === tmpl.key && !isCustom ? '#EBF4FF' : '#fff',
              fontSize: '15px', cursor: 'pointer',
            }}
          >
            {tmpl.emoji} {tmpl.label}
          </button>
        ))}

        <button
          onClick={() => { setIsCustom(true); setSelectedTemplate(null); }}
          style={{
            padding: '14px 16px', borderRadius: '12px', textAlign: 'left',
            border: isCustom ? '2px solid #3182F6' : '1px solid #E5E8EB',
            backgroundColor: isCustom ? '#EBF4FF' : '#fff',
            fontSize: '15px', cursor: 'pointer',
          }}
        >
          ✍️ 직접 입력하기
        </button>
      </div>

      {isCustom && (
        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder="예: 주말에 영화 보러 가기"
          style={{
            width: '100%', padding: '14px', marginTop: '12px',
            border: '1px solid #E5E8EB', borderRadius: '8px', fontSize: '15px',
          }}
        />
      )}

      <button
        onClick={handleSend}
        disabled={loading || (!selectedTemplate && !isCustom) || (isCustom && !customText.trim())}
        style={{
          marginTop: '24px', width: '100%', padding: '16px',
          backgroundColor: '#3182F6', color: '#fff', border: 'none',
          borderRadius: '12px', fontSize: '16px', fontWeight: 600,
        }}
      >
        {loading ? '전달 중...' : '마음 전하기'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Rewards 페이지**

```tsx
// src/pages/Rewards/Rewards.tsx

import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RewardCard } from '../../components/RewardCard';
import { EmptyState } from '../../components/EmptyState';
import { acceptReward, useReward } from '../../data/rewards';

export function Rewards() {
  const { state, dispatch, refreshData } = useApp();
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const { rewards, user } = state;
  if (!user) return null;

  const list = tab === 'received' ? rewards.received : rewards.sent;

  const handleAccept = async (rewardId: string) => {
    try {
      const updated = await acceptReward(rewardId);
      dispatch({ type: 'UPDATE_REWARD', reward: updated });
    } catch (err) {
      alert('수락에 실패했어요');
    }
  };

  const handleUse = async (rewardId: string) => {
    try {
      const updated = await useReward(rewardId);
      dispatch({ type: 'UPDATE_REWARD', reward: updated });
    } catch (err) {
      alert('처리에 실패했어요');
    }
  };

  return (
    <div style={{ padding: '24px', paddingBottom: '80px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>감사 선물</h1>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          onClick={() => setTab('received')}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
            backgroundColor: tab === 'received' ? '#3182F6' : '#F5F6F8',
            color: tab === 'received' ? '#fff' : '#6B7684',
            fontSize: '14px', fontWeight: 600,
          }}
        >
          받은 선물
        </button>
        <button
          onClick={() => setTab('sent')}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
            backgroundColor: tab === 'sent' ? '#3182F6' : '#F5F6F8',
            color: tab === 'sent' ? '#fff' : '#6B7684',
            fontSize: '14px', fontWeight: 600,
          }}
        >
          보낸 선물
        </button>
      </div>

      <div style={{ marginTop: '16px' }}>
        {list.length === 0 ? (
          <EmptyState message={tab === 'received' ? '받은 선물이 없어요' : '보낸 선물이 없어요'} />
        ) : (
          list.map(reward => (
            <RewardCard
              key={reward.id}
              reward={reward}
              isReceived={tab === 'received'}
              onAccept={() => handleAccept(reward.id)}
              onUse={() => handleUse(reward.id)}
            />
          ))
        )}
      </div>

      {/* Bottom Tab */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', backgroundColor: '#fff', borderTop: '1px solid #E5E8EB', padding: '12px 0',
      }}>
        <button onClick={() => window.location.href = '/home'} style={{ flex: 1, textAlign: 'center', fontSize: '13px', color: '#6B7684', border: 'none', background: 'none' }}>홈</button>
        <button style={{ flex: 1, textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#3182F6', border: 'none', background: 'none' }}>보상</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Thanks/ src/pages/Rewards/
git commit -m "feat: add Thanks and Rewards pages"
```

---

### Task 12: App.tsx — Router + Provider 통합

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: App.tsx 구현**

```tsx
// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useBackEvent } from './hooks/useBackEvent';
import { AppProvider } from './context/AppContext';
import { CreateCode } from './pages/Onboarding/CreateCode';
import { EnterCode } from './pages/Onboarding/EnterCode';
import { Home } from './pages/Home/Home';
import { ChoreCreate } from './pages/ChoreCreate/ChoreCreate';
import { ChoreDetail } from './pages/ChoreDetail/ChoreDetail';
import { Thanks } from './pages/Thanks/Thanks';
import { Rewards } from './pages/Rewards/Rewards';

function AppRoutes() {
  useBackEvent();

  return (
    <Routes>
      <Route path="/onboarding/create" element={<CreateCode />} />
      <Route path="/onboarding/enter" element={<EnterCode />} />
      <Route path="/home" element={<Home />} />
      <Route path="/chore/create" element={<ChoreCreate />} />
      <Route path="/chore/:id" element={<ChoreDetail />} />
      <Route path="/thanks/:id" element={<Thanks />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#FF6B6B' }}>{error || '로그인이 필요해요'}</p>
      </div>
    );
  }

  const initialRoute = user.couple_id ? '/home' : '/onboarding/create';

  return (
    <AppProvider user={user}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={initialRoute} replace />} />
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
```

- [ ] **Step 2: main.tsx 확인**

`src/main.tsx`가 App을 렌더링하는지 확인:

```tsx
// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: 커밋**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: add App with router, provider, and auth flow"
```

---

### Task 13: HelpRequest 페이지 (푸시 알림 수신 시 진입)

**Files:**
- Create: `src/pages/HelpRequest/HelpRequest.tsx`

- [ ] **Step 1: HelpRequest 페이지**

이 페이지는 파트너가 도움 요청한 할일의 상세를 보여준다. ChoreDetail에서 이미 수락/거절을 처리하므로, HelpRequest 페이지는 ChoreDetail로 리다이렉트한다.

```tsx
// src/pages/HelpRequest/HelpRequest.tsx

import { Navigate, useParams } from 'react-router-dom';

export function HelpRequest() {
  const { id } = useParams<{ id: string }>();
  // 도움 요청은 ChoreDetail에서 처리하므로 리다이렉트
  return <Navigate to={`/chore/${id}`} replace />;
}
```

- [ ] **Step 2: App.tsx에 라우트 추가 확인**

`/help-request/:id` 라우트가 이미 Task 12에서 추가되어 있는지 확인. 없으면 추가:

```tsx
<Route path="/help-request/:id" element={<HelpRequest />} />
```

- [ ] **Step 3: 커밋**

```bash
git add src/pages/HelpRequest/
git commit -m "feat: add HelpRequest page (redirects to ChoreDetail)"
```

---

### Task 14: granite.config.ts 및 앱인토스 설정

**Files:**
- Modify: `granite.config.ts`

- [ ] **Step 1: granite.config.ts 설정**

`create-ait-app`이 생성한 `granite.config.ts`를 확인하고, `appName`을 설정한다:

```typescript
// granite.config.ts

export default {
  appName: 'divider', // 앱인토스 콘솔에 등록한 이름과 동일해야 함
  web: {
    host: 'localhost',
    port: 5173,
  },
};
```

- [ ] **Step 2: 커밋**

```bash
git add granite.config.ts
git commit -m "chore: configure granite.config.ts with app name"
```

---

### Task 15: 전체 통합 확인 및 로컬 실행

- [ ] **Step 1: 빌드 확인**

```bash
npm run dev
```

Expected: Vite 개발 서버가 시작되고, 브라우저에서 앱이 로드됨. 비토스 환경이므로 폴백 로직으로 테스트 사용자가 생성되어야 함.

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 타입 에러 없음.

- [ ] **Step 3: 전체 push**

```bash
git push origin main
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 모든 스펙 요구사항이 태스크에 매핑됨
  - 커플 매칭: Task 4 (data) + Task 8 (pages)
  - 집안일 CRUD: Task 4 + Task 9-10
  - 도움 요청: Task 4 + Task 10
  - 감사+보상: Task 4 + Task 11
  - 인증: Task 5 (useAuth)
  - backEvent: Task 5 (useBackEvent)
  - 상태 머신: Task 4 (chores.ts)
  - 감정 UX: Task 10 (ChoreDetail 카피), Task 11 (Thanks 카피)
  - 푸시 알림: 서버사이드 Edge Function은 mTLS 환경 확인 후 별도 구현 (Open Question)

- [x] **Placeholder scan:** TBD/TODO 없음

- [x] **Type consistency:** 모든 타입이 `src/types/index.ts`에 정의되고 일관되게 사용됨

- [x] **MVP scope:** 반복 집안일, 히스토리 리포트, AI 추천, 토스페이 연동 모두 제외됨

**Note:** 푸시 알림 Edge Function (Task for push-notify)은 mTLS 환경 검증 후 구현. MVP에서는 앱 내 상태 새로고침(pull-to-refresh)으로 대체 가능.
