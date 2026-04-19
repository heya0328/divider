import { ListRow, Badge } from '@toss/tds-mobile';
import type { Chore, ChoreStatus, User } from '../types';

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

  const assigneeName =
    chore.assignee_id === currentUser.id
      ? '나'
      : partner?.nickname ?? '파트너';

  const dueDateText = chore.due_date ? ` · ${chore.due_date}` : '';

  return (
    <ListRow
      onClick={onClick}
      contents={
        <ListRow.Texts
          type="2RowTypeA"
          top={chore.title}
          bottom={`담당: ${assigneeName}${dueDateText}`}
        />
      }
      right={
        <div style={{ display: 'flex', gap: 6 }}>
          <Badge size="small" variant="fill" color={STATUS_COLORS[chore.status]}>
            {STATUS_LABELS[chore.status]}
          </Badge>
          {isOverdue && (
            <Badge size="small" variant="fill" color="red">
              기한 초과
            </Badge>
          )}
        </div>
      }
      arrowType="right"
    />
  );
}
