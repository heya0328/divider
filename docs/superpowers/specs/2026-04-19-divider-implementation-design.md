# Divider Implementation Spec

## Overview

맞벌이 부부를 위한 집안일 분담 및 보상 서비스. 앱인토스 WebView 미니앱으로 배포.
핵심 가치: "못 했을 때도 관계가 상하지 않도록" 감정의 흐름을 설계하는 서비스.

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router v6
- **State:** React Context + useReducer
- **UI:** TDS Web (Toss Design System)
- **Backend:** Supabase (Postgres + Edge Functions)
- **Auth:** 앱인토스 토스 로그인 SDK → Supabase 사용자 관리
- **Push:** 앱인토스 스마트 발송 API (mTLS)
- **Deploy:** 앱인토스 WebView 미니앱

## Project Structure

```
toss-divider/
├── granite.config.ts
├── index.html
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # Router + AppProvider
│   ├── pages/
│   │   ├── Onboarding/
│   │   │   ├── CreateCode.tsx     # 초대코드 생성
│   │   │   └── EnterCode.tsx      # 초대코드 입력
│   │   ├── Home/
│   │   │   └── Home.tsx           # 오늘의 할일 (내+파트너 섹션)
│   │   ├── ChoreCreate/
│   │   │   └── ChoreCreate.tsx    # 할일 등록
│   │   ├── ChoreDetail/
│   │   │   └── ChoreDetail.tsx    # 할일 상세 + 완료/도움요청
│   │   ├── HelpRequest/
│   │   │   └── HelpRequest.tsx    # 도움 요청 확인/수락/거절
│   │   ├── Thanks/
│   │   │   └── Thanks.tsx         # 감사 + 보상 선택
│   │   └── Rewards/
│   │       └── Rewards.tsx        # 받은/보낸 보상 목록
│   ├── components/
│   │   ├── ChoreCard.tsx          # 할일 카드 (TDS)
│   │   ├── RewardCard.tsx         # 보상 카드
│   │   └── EmptyState.tsx         # 빈 상태 UI
│   ├── hooks/
│   │   ├── useBackEvent.ts        # backEvent 뒤로가기
│   │   ├── useAuth.ts             # 토스 로그인
│   │   └── useShare.ts            # share() SDK
│   ├── context/
│   │   └── AppContext.tsx         # 전역 상태
│   ├── data/
│   │   ├── chores.ts
│   │   ├── couples.ts
│   │   ├── helpRequests.ts
│   │   ├── rewards.ts
│   │   └── supabase.ts
│   ├── types/
│   │   └── index.ts
│   └── constants/
│       └── index.ts
├── supabase/
│   ├── migrations/
│   └── functions/
│       └── push-notify/
```

## Data Model

```sql
CREATE TYPE chore_status AS ENUM (
  'draft', 'pending', 'in_progress', 'help_requested', 'reassigned', 'completed'
);
CREATE TYPE help_request_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE reward_status AS ENUM ('pending', 'accepted', 'used');
CREATE TYPE reward_type AS ENUM ('template', 'custom');

-- couples를 먼저 생성 (users.couple_id FK를 위해)
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  invite_code_expires_at TIMESTAMPTZ NOT NULL,
  user_a_id UUID NOT NULL,  -- users 생성 후 FK 추가
  user_b_id UUID,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_user_id TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  couple_id UUID REFERENCES couples(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 순환 참조 해결: users 생성 후 couples FK 추가
ALTER TABLE couples ADD CONSTRAINT fk_user_a FOREIGN KEY (user_a_id) REFERENCES users(id);
ALTER TABLE couples ADD CONSTRAINT fk_user_b FOREIGN KEY (user_b_id) REFERENCES users(id);

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

CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id UUID NOT NULL REFERENCES chores(id),
  requester_id UUID NOT NULL REFERENCES users(id),
  helper_id UUID REFERENCES users(id),
  status help_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

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
```

## Chore State Machine

```
[draft] ──(상대방 수락)──→ [pending] ──(담당자 시작)──→ [in_progress]
   │                                                       │
(상대방 거절)                                    (담당자가 도움 요청)
   │                                                       │
   ▼                                                       ▼
[rejected/삭제]                                      [help_requested]
                                                      │         │
                                           (파트너 수락)    (파트너 거절/24h 만료)
                                                 │              │
                                                 ▼              ▼
                                           [reassigned]    [in_progress]
                                                 │
                                           (완료 처리)
                                                 │
                                                 ▼
                                           [completed] ←── (담당자 직접 완료)
```

**Edge cases:**
- 파트너가 할일 등록을 거절: draft 상태에서 삭제 처리, 등록자에게 알림
- 파트너가 도움 요청 거절: in_progress로 복귀, 원래 담당자에게 알림
- 도움 요청 24시간 경과: 자동 만료, in_progress로 복귀
- due_date 경과 + 미완료: 상태 유지, 홈에서 "밀린 일" 배지
- 동시 완료 처리: UPDATE WHERE status != 'completed' (optimistic lock)

## User Flows

### 1. Onboarding (커플 매칭)
1. 앱 진입 → 토스 로그인 (자동)
2. 매칭 여부 확인
   - 미매칭: "초대코드 만들기" / "초대코드 입력하기" 선택
   - 매칭 완료: 홈으로 이동
3. 코드 생성 시: 6자리 코드 표시 + share() SDK로 공유
4. 코드 입력 시: 6자리 입력 → 검증 → 매칭 완료 → 홈

**Edge cases:**
- 잘못된 코드: "코드를 다시 확인해주세요"
- 만료된 코드: "코드가 만료됐어요. 파트너에게 새 코드를 요청해주세요"
- 이미 매칭됨: "이미 파트너와 연결되어 있어요"

### 2. Home (오늘의 할일)
- 상단: "오늘의 우리 집안일" 제목
- 섹션 1: 내 할일 (assigned to me, status != draft/completed)
- 섹션 2: 파트너 할일 (assigned to partner, status != draft)
- 섹션 3: 수락 대기중 (draft 상태, 내가 수락해야 하는 것)
- FAB: "+" 버튼 → 할일 등록
- 하단 탭: 홈 / 보상

### 3. Chore Create (할일 등록)
- 제목 입력 (텍스트)
- 담당자 선택 (나 / 파트너)
- 마감일 선택 (DatePicker)
- "등록하기" → draft 상태로 생성 → 파트너에게 수락 요청 푸시

### 4. Chore Detail (할일 상세)
- 제목, 담당자, 마감일, 상태 표시
- 담당자 본인일 때:
  - "완료했어요" 버튼 → completed 전환
  - "도움 받을래요" 버튼 → help_requested 전환 + 파트너에게 푸시
- 파트너 할일일 때:
  - "내가 대신할게" 버튼 (help_requested 상태일 때만)

### 5. Thanks (감사 + 보상)
- 재할당된 할일이 완료되면 자동 진입
- "파트너가 해줬어요!" 메시지
- 보상 템플릿 선택: 커피, 디저트, 안마, 메뉴 선택권, 휴식권
- 커스텀 보상 입력
- "마음 전하기" → 보상 생성 + 파트너에게 푸시

### 6. Rewards (보상 관리)
- 탭: 받은 보상 / 보낸 보상
- 각 보상 카드: 제목, 보상 내용, 상태(대기/수락/사용됨)
- 받은 보상: "수락하기", "사용 완료" 버튼

## Push Notifications

앱인토스 스마트 발송 API (기능성 푸시). Supabase Database Webhook → Edge Function 트리거.

| Trigger | Recipient | Message |
|---------|-----------|---------|
| draft 생성 | 수락 대상 파트너 | "{닉네임}님이 '설거지'를 등록했어요. 확인해주세요" |
| 도움 요청 | 파트너 | "{닉네임}님이 '설거지' 도움을 요청했어요" |
| 도움 수락 | 요청자 | "{닉네임}님이 대신 해주기로 했어요!" |
| 도움 거절 | 요청자 | "{닉네임}님이 오늘은 어렵대요" |
| 대신 완료 | 원래 담당자 | "{닉네임}님이 '설거지'를 해줬어요. 고마움을 전해보세요" |
| 보상 전달 | 대신 해준 사람 | "{닉네임}님이 감사 선물을 보냈어요!" |

**mTLS 대안:** Supabase Edge Function에서 mTLS 불가 시 별도 Node.js 프록시 서버 운영.

## Auth Strategy

1. 앱 진입 시 앱인토스 SDK 토스 로그인 호출
2. 토스 로그인에서 사용자 토큰/ID 수신
3. Supabase Edge Function으로 토큰 검증 → JWT 발급
4. 클라이언트에서 Supabase JWT로 인증된 요청

## RLS (Row Level Security)

- users: `auth.uid() = id`
- couples: `auth.uid() IN (user_a_id, user_b_id)`
- chores: `couple_id IN (SELECT id FROM couples WHERE auth.uid() IN (user_a_id, user_b_id))`
- help_requests: chore의 couple을 통해 접근 제어
- rewards: couple 소속 확인

## backEvent Handling

```typescript
const BACK_MAP: Record<string, string | null> = {
  '/home': null,                  // 종료 다이얼로그
  '/chore/create': '/home',
  '/chore/:id': '/home',
  '/help-request/:id': '/home',
  '/thanks/:id': '/home',
  '/rewards': '/home',
  '/onboarding/create': null,     // 종료 다이얼로그
  '/onboarding/enter': null,      // 종료 다이얼로그
};
```

## Error Handling

- **SDK API:** isSupported() → try-catch → 비토스 환경 폴백
- **Supabase:** data 레이어에서 throw → 페이지에서 catch → TDS Toast 알림
- **Network:** 낙관적 업데이트, 실패 시 롤백 + "다시 시도해주세요" Toast
- **Auth 실패:** 온보딩 화면으로 리다이렉트

## Testing Strategy

- 데이터 레이어 유닛 테스트 (CRUD operations)
- 상태 머신 전환 로직 테스트
- SDK 방어 코드 테스트 (비토스 환경)

## Reward Templates

```typescript
const REWARD_TEMPLATES = [
  { key: 'coffee', label: '커피 한 잔', emoji: '☕' },
  { key: 'dessert', label: '디저트', emoji: '🍰' },
  { key: 'massage', label: '안마 10분', emoji: '💆' },
  { key: 'menu_choice', label: '오늘 메뉴 선택권', emoji: '🍽️' },
  { key: 'rest', label: '1시간 휴식권', emoji: '😴' },
] as const;
```

## Emotional UX Guidelines

| Screen | Emotion | Principle | Expression |
|--------|---------|-----------|------------|
| Home | 가벼운 책임감 | 부담 없이, 오늘 중심 | "오늘의 우리 집안일" |
| 도움 요청 | 미안함 | 죄책감 최소화 | "오늘 이 일, 도움 받을래요?" |
| 요청 수신 | 선택의 자유 | 강제 아닌 제안 | "대신 해줄 수 있어요?" |
| 완료 알림 | 고마움 | 즉시 감사 유도 | "파트너가 해줬어요!" |
| 감사+보상 | 따뜻함 | 부드러운 보상 | 카드 UI, 따뜻한 톤 |

**카피 원칙:** "미완료" → "도움 요청 가능", "정산" → "감사 전달", "실패" → "상황이 어려웠나 봐요"

## MVP Scope

**포함:**
- 커플 매칭 (초대코드)
- 집안일 등록/수락/완료 (협의 방식)
- 도움 요청/수락/거절
- 감사 + 보상 (상징적 토큰)
- 보상 관리 (받은/보낸)
- 푸시 알림

**제외:**
- 반복 집안일 자동 생성
- 히스토리/주간 리포트
- AI 추천
- 토스페이 연동
- 외부 쿠폰 발행
- 비토스 사용자 지원
