import type { Chore, User } from '../types';
import type { ChoreStatus } from '../types';

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

export default function ChoreCard({ chore, currentUser, partner, onClick }: ChoreCardProps) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = chore.due_date < today && chore.status !== 'completed';
  const isHelpRequested = chore.status === 'help_requested';

  const assigneeName =
    chore.assignee_id === currentUser.id
      ? '나'
      : partner?.nickname ?? '파트너';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '16px', color: '#111827' }}>
          {chore.title}
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: isHelpRequested ? '#fed7aa' : '#f3f4f6',
              color: isHelpRequested ? '#c2410c' : '#6b7280',
              fontWeight: 500,
            }}
          >
            {STATUS_LABELS[chore.status]}
          </span>
          {isOverdue && (
            <span
              style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontWeight: 500,
              }}
            >
              기한 초과
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>담당: {assigneeName}</span>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>{chore.due_date}</span>
      </div>
    </div>
  );
}
