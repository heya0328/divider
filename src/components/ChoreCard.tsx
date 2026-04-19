import { Paragraph, Badge } from '@toss/tds-mobile';
import type { Chore, ChoreStatus, User } from '../types';
import { REWARD_TEMPLATES } from '../constants';

interface ChoreCardProps {
  chore: Chore;
  currentUser: User;
  partner: User | null;
  onClick: () => void;
}

const STATUS_LABELS: Record<ChoreStatus, string> = {
  draft: '수락 대기',
  pending: '할 일',
  in_progress: '진행 중',
  help_requested: '도움 요청 중',
  reassigned: '대신 하는 중',
  completed: '완료',
};

const STATUS_COLORS: Record<ChoreStatus, 'blue' | 'teal' | 'green' | 'red' | 'yellow' | 'elephant'> = {
  draft: 'elephant',
  pending: 'blue',
  in_progress: 'blue',
  help_requested: 'yellow',
  reassigned: 'blue',
  completed: 'green',
};

export default function ChoreCard({ chore, currentUser, partner, onClick }: ChoreCardProps) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = chore.due_date != null && chore.due_date < today && chore.status !== 'completed';
  const isCompleted = chore.status === 'completed';

  const assigneeName =
    chore.assignee_id === currentUser.id
      ? '나'
      : partner?.nickname ?? '파트너';

  const dueDateText = chore.due_date ? ` · ${chore.due_date}` : '';

  // 보상 제안 라벨
  const rewardLabel = (() => {
    if (!chore.proposed_reward_type) return null;
    if (chore.proposed_reward_type === 'template' && chore.proposed_reward_key) {
      const t = REWARD_TEMPLATES.find(r => r.key === chore.proposed_reward_key);
      return t ? t.emoji : null;
    }
    return '🎁';
  })();

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        border: `2px solid ${isCompleted ? '#3182f6' : isOverdue ? '#ef4444' : '#d1d5db'}`,
        backgroundColor: isCompleted ? '#3182f6' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isCompleted && <span style={{ color: '#fff', fontSize: '14px', lineHeight: 1 }}>✓</span>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Paragraph typography="t6" fontWeight="medium" color={isCompleted ? '#9ca3af' : '#111827'}>
          <Paragraph.Text style={isCompleted ? { textDecoration: 'line-through' } : undefined}>
            {chore.title}
          </Paragraph.Text>
        </Paragraph>
        <Paragraph typography="t7" color="#9ca3af">
          <Paragraph.Text>{assigneeName}{dueDateText}{rewardLabel ? ` ${rewardLabel}` : ''}</Paragraph.Text>
        </Paragraph>
      </div>

      {/* Status Badge */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!isCompleted && (
          <Badge size="small" variant="weak" color={STATUS_COLORS[chore.status]}>
            {STATUS_LABELS[chore.status]}
          </Badge>
        )}
        {isOverdue && (
          <Badge size="small" variant="fill" color="red">
            기한 초과
          </Badge>
        )}
      </div>

      {/* Arrow */}
      <span style={{ color: '#d1d5db', fontSize: '16px', flexShrink: 0 }}>›</span>
    </div>
  );
}
