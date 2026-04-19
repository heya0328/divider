import { ListRow } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import type { Chore, ChoreStatus, User } from '../types';
import { REWARD_TEMPLATES } from '../constants';

interface ChoreCardProps {
  chore: Chore;
  currentUser: User;
  partner: User | null;
  onClick: () => void;
  onComplete?: () => void;
}

const STATUS_LABELS: Record<ChoreStatus, string> = {
  draft: '수락 대기',
  pending: '할 일',
  in_progress: '진행 중',
  help_requested: '도움 요청 중',
  reassigned: '대신 하는 중',
  completed: '완료',
};

export default function ChoreCard({ chore, currentUser, partner, onClick, onComplete }: ChoreCardProps) {
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

  const canComplete = !isCompleted && onComplete &&
    chore.assignee_id === currentUser.id &&
    (chore.status === 'in_progress' || chore.status === 'reassigned');

  // 체크 아이콘: 완료 → 파란 체크, 미완료 → 빈 원
  const checkIconName = isCompleted
    ? 'icon-check-circle-blue'
    : 'icon-system-check-circle-outlined';
  const checkIconColor = isCompleted ? undefined : adaptive.grey300;

  const bottomText = [
    assigneeName,
    dueDateText,
    isOverdue ? '기한 초과' : '',
    !isCompleted ? STATUS_LABELS[chore.status] : '',
  ].filter(Boolean).join(' · ') + rewardEmoji;

  return (
    <ListRow
      onClick={(e) => {
        // 체크 아이콘 영역 클릭 시 완료 처리
        const target = e.target as HTMLElement;
        if (canComplete && target.closest('[data-check-icon]')) {
          e.stopPropagation();
          onComplete!();
          return;
        }
        onClick();
      }}
      left={
        <div
          data-check-icon
          onClick={(e) => {
            if (canComplete) {
              e.stopPropagation();
              onComplete!();
            }
          }}
        >
          <ListRow.AssetIcon
            size="xsmall"
            shape="original"
            name={checkIconName}
            color={checkIconColor}
          />
        </div>
      }
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
    />
  );
}
