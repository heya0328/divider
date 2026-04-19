import { Text, Asset } from '@toss/tds-mobile';
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

  const canCheck = !isCompleted && !!onCheckClick &&
    chore.assignee_id === currentUser.id &&
    (chore.status === 'pending' || chore.status === 'in_progress' || chore.status === 'reassigned');

  const bottomText = [
    assigneeName,
    dueDateText,
    isOverdue ? '기한 초과' : '',
    !isCompleted ? STATUS_LABELS[chore.status] : '',
  ].filter(Boolean).join(' · ') + rewardEmoji;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: `1px solid ${adaptive.grey100}`,
      }}
    >
      {/* 체크 아이콘 영역 */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (canCheck) onCheckClick!();
        }}
        disabled={!canCheck}
        style={{
          background: 'none',
          border: 'none',
          padding: '16px 8px 16px 20px',
          cursor: canCheck ? 'pointer' : 'default',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {isCompleted ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill={adaptive.blue500} />
            <path d="M7 12.5L10.5 16L17 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke={canCheck ? adaptive.grey400 : adaptive.grey200} strokeWidth="1.5" />
            {canCheck && (
              <path d="M7 12.5L10.5 16L17 9" stroke={adaptive.grey300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        )}
      </button>

      {/* 콘텐츠 영역 */}
      <div
        onClick={onClick}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '16px 20px 16px 8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Text
            typography="t6"
            fontWeight="bold"
            color={isCompleted ? adaptive.grey400 : adaptive.grey800}
          >
            {chore.template_id ? '🔁 ' : ''}{chore.title}
          </Text>
          <Text display="block" typography="t7" color={isOverdue ? adaptive.red500 : adaptive.grey500}>
            {bottomText}
          </Text>
        </div>
        <Asset.Icon
          frameShape={Asset.frameShape.CleanW24}
          name="icon-arrow-right-mono"
          color={adaptive.grey300}
          aria-hidden
        />
      </div>
    </div>
  );
}
