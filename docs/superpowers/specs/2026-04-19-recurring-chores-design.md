# Recurring Chores Design

## Overview

반복 집안일 자동 생성 기능. `chore_templates` 테이블에 반복 규칙을 저장하고, 앱 접속 시 클라이언트가 다음 주기의 chore가 없으면 자동 생성한다.

## Data Model

### `chore_templates` 테이블 (신규)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| couple_id | UUID FK → couples | |
| title | TEXT NOT NULL | 집안일 이름 |
| created_by_id | UUID FK → users | 템플릿 생성자 |
| assignee_id | UUID FK → users | 담당자 |
| recurrence_type | TEXT NOT NULL | `'weekly'` or `'monthly'` |
| recurrence_days | INTEGER[] | weekly: 요일 배열 (0=일~6=토) |
| monthly_nth | INTEGER | monthly: 몇째 주 (1~4) |
| monthly_weekday | INTEGER | monthly: 요일 (0=일~6=토) |
| proposed_reward_type | reward_type | 보상 타입 |
| proposed_reward_key | TEXT | 보상 템플릿 키 |
| proposed_reward_text | TEXT | 커스텀 보상 텍스트 |
| is_active | BOOLEAN DEFAULT true | 활성 여부 |
| last_generated_date | DATE | 마지막 생성 기준일 |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### `chores` 테이블 변경

| Column | Type | Description |
|--------|------|-------------|
| template_id | UUID FK → chore_templates, nullable | 자동 생성된 경우 원본 템플릿 참조 |

## Recurrence Rules

### Weekly (매주)

- `recurrence_days`: 요일 배열 (0=일, 1=월, ..., 6=토)
- 복수 요일 선택 가능: `[1, 3, 5]` = 매주 월/수/금
- 예시: "매주 월/수/금 설거지"

### Monthly (매월)

- `monthly_nth`: 몇째 주 (1=첫째, 2=둘째, 3=셋째, 4=넷째)
- `monthly_weekday`: 요일 (0=일~6=토)
- 예시: "매월 셋째 토요일 대청소" → `monthly_nth=3`, `monthly_weekday=6`

## Auto-Generation Logic

위치: `src/data/choreTemplates.ts` → `syncRecurringChores(coupleId, userId)`

### 트리거

- Home 페이지 마운트 시 호출 (`loadData` 내)
- `refreshData()` 직후 실행

### 알고리즘

```
for each active template where couple_id = coupleId:
  startDate = last_generated_date + 1일 (없으면 template.created_at)
  endDate = 오늘
  
  if recurrence_type == 'weekly':
    startDate ~ endDate 사이의 날짜 중 recurrence_days에 해당하는 요일 수집
  elif recurrence_type == 'monthly':
    startDate ~ endDate 사이의 날짜 중 monthly_nth번째 monthly_weekday 수집
  
  for each targetDate:
    INSERT chore (status='pending', template_id=template.id, due_date=targetDate)
  
  UPDATE template SET last_generated_date = endDate
```

### 중복 방지

- `last_generated_date`를 기준으로 이미 생성된 날짜는 건너뜀
- 트랜잭션 단위로 chore 생성 + last_generated_date 업데이트

### 파트너 배정 시

- 자동 생성된 chore는 항상 `pending` (draft 아님)
- 반복 설정 자체가 합의된 것으로 간주

## UI Changes

### ChoreCreate 페이지 — 반복 설정 섹션

마감일 섹션 위에 반복 설정 추가:

1. **반복 타입 선택**: 없음 / 매주 / 매월 (3개 옵션, ListRow + Radio)
2. **매주 선택 시**: 요일 복수 선택 (월~일, 7개 칩/토글 버튼)
3. **매월 선택 시**: N번째 드롭다운 (첫째~넷째) + 요일 선택 (일~토)
4. 반복 선택 시 마감일 필드는 숨기고, 첫 발생일을 자동 계산하여 표시

### MyPage — 반복 관리 섹션

워크스페이스 정보 아래에 "반복 일정" 섹션 추가:

- 활성 반복 템플릿 리스트 (ListRow)
- 각 항목: 제목, 반복 규칙 요약 ("매주 월/수/금"), 담당자
- 우측: 활성/비활성 토글 (Switch 컴포넌트 또는 Badge)
- 클릭 시 삭제 확인 다이얼로그

### Home — 반복 표시

- 자동 생성된 chore (template_id가 있는 경우) ChoreCard에 🔁 아이콘 표시

## Type Changes

### `src/types/index.ts`

```typescript
export type RecurrenceType = 'weekly' | 'monthly';

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

// Chore에 template_id 추가
export interface Chore {
  // ... 기존 필드
  template_id: string | null;
}
```

## File Structure

```
src/data/choreTemplates.ts    — CRUD + syncRecurringChores 로직
supabase/migrations/002_recurring_chores.sql — 스키마 변경
```

## Scope Boundaries

- Supabase Edge Function / cron 사용하지 않음 (클라이언트 전용)
- 반복 종료일(end date) 없음 — is_active 토글로 관리
- 반복 규칙 수정 불가 — 삭제 후 재생성 (MVP 단순화)
