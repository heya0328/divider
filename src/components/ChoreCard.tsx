import { Paragraph, Badge, ListRow, Checkbox, Spacing } from '@toss/tds-mobile';
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

const STATUS_COLORS: Record<ChoreStatus, 'blue' | 'teal' | 'green' | 'red' | 'yellow' | 'elephant'> = {
  draft: 'elephant',
  pending: 'blue',
  in_progress: 'blue',
  help_requested: 'yellow',
  reassigned: 'blue',
  completed: 'green',
};

export default function ChoreCard({ chore, currentUser, partner, onClick, onComplete }: ChoreCardProps) {
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

  const canComplete = !isCompleted && onComplete && chore.assignee_id === currentUser.id &&
    (chore.status === 'in_progress' || chore.status === 'reassigned');

  return (
    <ListRow
      onClick={onClick}
      withArrow
      withTouchEffect
      border="none"
      left={
        <div
          onClick={(e) => {
            if (canComplete) {
              e.stopPropagation();
              onComplete();
            }
          }}
        >
          <Checkbox.Circle
            checked={isCompleted}
            size={24}
            onCheckedChange={() => {
              if (canComplete) {
                onComplete();
              }
            }}
            readOnly={!canComplete}
          />
        </div>
      }
      contents={
        <ListRow.Texts
          type="2RowTypeA"
          top={
            <Paragraph typography="t6" fontWeight="medium" color={isCompleted ? '#9ca3af' : '#111827'}>
              <Paragraph.Text style={isCompleted ? { textDecoration: 'line-through' } : undefined}>
                {chore.title}
              </Paragraph.Text>
            </Paragraph>
          }
          bottom={
            <Paragraph typography="t7" color="#9ca3af">
              <Paragraph.Text>{assigneeName}{dueDateText}{rewardLabel ? ` ${rewardLabel}` : ''}</Paragraph.Text>
            </Paragraph>
          }
        />
      }
      right={
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
      }
    />
  );
}
