import { ListRow } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import type { Chore, ChoreStatus, User } from '../types';
import { REWARD_TEMPLATES } from '../constants';

interface ChoreCardProps {
  chore: Chore;
  currentUser: User;
  partner: User | null;
  onClick: () => void;
  onCheckClick?: () => void;
}

const STATUS_LABELS: Record<ChoreStatus, string> = {
  draft: '수락 대기',
  pending: '할 일',
  in_progress: '진행 중',
  help_requested: '도움 요청 중',
  reassigned: '대신 하는 중',
  completed: '완료',
};

export default function ChoreCard({ chore, currentUser, partner, onClick, onCheckClick }: ChoreCardProps) {
  const isCompleted = chore.status === 'completed';
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = chore.due_date != null && chore.due_date < today && !isCompleted;

  const assigneeName = chore.assignee_id === currentUser.id ? '나' : (partner?.nickname ?? '파트너');
  const dueDateText = chore.due_date ?? '';
  const rewardEmoji = (() => {
    if (!chore.proposed_reward_type) return '';
    if (chore.proposed_reward_type === 'template' && chore.proposed_reward_key) {
      const t = REWARD_TEMPLATES.find(r => r.key === chore.proposed_reward_key);
      return t ? ` ${t.emoji}` : '';
    }
    return ' 🎁';
  })();

  const canCheck = !isCompleted && onCheckClick &&
    chore.assignee_id === currentUser.id &&
    (chore.status === 'pending' || chore.status === 'in_progress' || chore.status === 'reassigned');

  const bottomText = [
    assigneeName,
    dueDateText,
    isOverdue ? '기한 초과' : '',
    !isCompleted ? STATUS_LABELS[chore.status] : '',
  ].filter(Boolean).join(' · ') + rewardEmoji;

  // 체크 아이콘과 ListRow를 나란히 배치하여
  // 체크 영역 클릭과 나머지 영역 클릭을 완전히 분리
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {/* 체크 아이콘 — ListRow 바깥에 독립적으로 배치 */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (canCheck) onCheckClick!();
        }}
        style={{
          paddingLeft: '20px',
          paddingRight: '4px',
          paddingTop: '16px',
          paddingBottom: '16px',
          cursor: canCheck ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        {isCompleted ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill={adaptive.blue500} />
            <path d="M7 12.5L10.5 16L17 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke={adaptive.grey300} strokeWidth="1.5" />
            {canCheck && <path d="M7 12.5L10.5 16L17 9" stroke={adaptive.grey300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        )}
      </div>

      {/* 나머지 영역 — ListRow로 클릭 시 상세 페이지 이동 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <ListRow
          onClick={onClick}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={chore.title}
              topProps={{
                color: isCompleted ? adaptive.grey400 : adaptive.grey800,
                fontWeight: 'bold',
              }}
              bottom={bottomText}
              bottomProps={{
                color: isOverdue ? adaptive.red500 : adaptive.grey600,
              }}
            />
          }
          verticalPadding="large"
          arrowType="right"
          horizontalPadding="small"
        />
      </div>
    </div>
  );
}
