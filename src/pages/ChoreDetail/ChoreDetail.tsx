import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paragraph, Spacing, Badge, Button, TableRow } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import {
  acceptDraftChore,
  rejectDraftChore,
  startChore,
  completeChore,
  requestHelp,
  reassignChore,
  revertToInProgress,
} from '../../data/chores';
import { createHelpRequest, acceptHelpRequest, declineHelpRequest, getPendingHelpRequest } from '../../data/helpRequests';
import type { ChoreStatus } from '../../types';

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

export default function ChoreDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, partner, chores, dispatch, refreshData } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chore = chores.find((c) => c.id === id);

  if (!user || !chore) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Paragraph typography="t5" color="#6b7280" textAlign="center">
          <Paragraph.Text>할 일을 찾을 수 없어요</Paragraph.Text>
        </Paragraph>
        <Spacing size={16} />
        <Button size="medium" color="primary" variant="fill" onClick={() => navigate('/home')}>
          홈으로
        </Button>
      </div>
    );
  }

  const isMyChore = chore.assignee_id === user.id;
  const isPartnerChore = partner != null && chore.assignee_id === partner.id;

  // 파트너가 나에게 할당한 draft → 내가 수락해야 함
  const needsMyApproval =
    chore.status === 'draft' &&
    chore.assignee_id === user.id &&
    chore.created_by_id !== user.id;

  // 완료된 chore에서 감사를 보낼 수 있는지:
  // 내가 원래 담당자인데 다른 사람이 대신 완료한 경우
  const canSendThanks =
    chore.status === 'completed' &&
    chore.original_assignee_id === user.id &&
    chore.completed_by_id != null &&
    chore.completed_by_id !== user.id;

  const assigneeName = isMyChore ? '나' : (partner?.nickname ?? '파트너');

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // --- 액션 핸들러 ---

  const handleAcceptDraft = () =>
    run(async () => {
      const updated = await acceptDraftChore(chore.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
    });

  const handleRejectDraft = () =>
    run(async () => {
      const updated = await rejectDraftChore(chore.id, chore.created_by_id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
      navigate('/home');
    });

  const handleStart = () =>
    run(async () => {
      const updated = await startChore(chore.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
    });

  const handleComplete = () =>
    run(async () => {
      const updated = await completeChore(chore.id, user.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
      navigate('/home');
    });

  const handleRequestHelp = () =>
    run(async () => {
      await createHelpRequest(chore.id, user.id);
      const updated = await requestHelp(chore.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
    });

  const handleTakeOver = () =>
    run(async () => {
      const helpReq = await getPendingHelpRequest(chore.id);
      if (helpReq) {
        await acceptHelpRequest(helpReq.id, user.id);
      }
      const updated = await reassignChore(chore.id, user.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
    });

  const handleDeclineHelp = () =>
    run(async () => {
      const helpReq = await getPendingHelpRequest(chore.id);
      if (helpReq) {
        await declineHelpRequest(helpReq.id);
      }
      // 도움 거절 시 chore를 in_progress로 되돌림
      const updated = await revertToInProgress(chore.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
      navigate('/home');
    });

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button size="small" color="light" variant="weak" onClick={() => navigate('/home')}>
          ←
        </Button>
        <Paragraph typography="t4" fontWeight="bold" color="#111827">
          <Paragraph.Text>할 일 상세</Paragraph.Text>
        </Paragraph>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Chore title */}
        <Paragraph typography="t3" fontWeight="bold" color={chore.status === 'completed' ? '#9ca3af' : '#111827'}>
          <Paragraph.Text>{chore.title}</Paragraph.Text>
        </Paragraph>

        <Spacing size={20} />

        {/* Info rows */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <TableRow
            align="space-between"
            left="상태"
            right={
              <Badge size="small" variant="fill" color={STATUS_COLORS[chore.status]}>
                {STATUS_LABELS[chore.status]}
              </Badge>
            }
          />
          <TableRow align="space-between" left="담당자" right={assigneeName} />
          <TableRow align="space-between" left="마감일" right={chore.due_date ?? '없음'} />
          {chore.status === 'completed' && chore.completed_by_id && (
            <TableRow
              align="space-between"
              left="완료한 사람"
              right={chore.completed_by_id === user.id ? '나' : (partner?.nickname ?? '파트너')}
            />
          )}
        </div>

        <Spacing size={24} />

        {error && (
          <>
            <Paragraph typography="t7" color="#dc2626">
              <Paragraph.Text>{error}</Paragraph.Text>
            </Paragraph>
            <Spacing size={12} />
          </>
        )}

        {/* --- 조건부 액션 버튼 --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* draft: 파트너가 나에게 할당 → 수락/거절 */}
          {needsMyApproval && (
            <>
              <Button size="xlarge" display="full" color="primary" variant="fill"
                onClick={handleAcceptDraft} disabled={loading} loading={loading}>
                수락하기
              </Button>
              <Button size="xlarge" display="full" color="light" variant="weak"
                onClick={handleRejectDraft} disabled={loading}>
                괜찮아요, 다음에
              </Button>
            </>
          )}

          {/* pending: 내 할일 → 시작하기 */}
          {chore.status === 'pending' && isMyChore && (
            <Button size="xlarge" display="full" color="primary" variant="fill"
              onClick={handleStart} disabled={loading} loading={loading}>
              시작하기
            </Button>
          )}

          {/* in_progress: 내 할일 → 완료 또는 도움 요청 */}
          {chore.status === 'in_progress' && isMyChore && (
            <>
              <Button size="xlarge" display="full" color="primary" variant="fill"
                onClick={handleComplete} disabled={loading} loading={loading}>
                완료했어요
              </Button>
              <Button size="xlarge" display="full" color="light" variant="weak"
                onClick={handleRequestHelp} disabled={loading}>
                오늘 이 일, 도움 받을래요
              </Button>
            </>
          )}

          {/* help_requested: 파트너 할일 → 대신할게 또는 거절 */}
          {chore.status === 'help_requested' && isPartnerChore && (
            <>
              <Button size="xlarge" display="full" color="primary" variant="fill"
                onClick={handleTakeOver} disabled={loading} loading={loading}>
                내가 대신할게
              </Button>
              <Button size="xlarge" display="full" color="light" variant="weak"
                onClick={handleDeclineHelp} disabled={loading}>
                괜찮아요, 다음에
              </Button>
            </>
          )}

          {/* reassigned: 내가 대신 맡은 할일 → 완료 */}
          {chore.status === 'reassigned' && isMyChore && (
            <Button size="xlarge" display="full" color="primary" variant="fill"
              onClick={handleComplete} disabled={loading} loading={loading}>
              완료했어요
            </Button>
          )}

          {/* completed: 내가 원래 담당인데 파트너가 대신 해줌 → 감사 보내기 */}
          {canSendThanks && (
            <>
              <Spacing size={8} />
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '12px' }}>
                <Paragraph typography="t6" color="#3182f6" textAlign="center">
                  <Paragraph.Text>{partner?.nickname ?? '파트너'}님이 대신 해줬어요!</Paragraph.Text>
                </Paragraph>
              </div>
              <Spacing size={8} />
              <Button size="xlarge" display="full" color="primary" variant="fill"
                onClick={() => navigate(`/thanks/${chore.id}`)}>
                감사 선물 보내기
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
