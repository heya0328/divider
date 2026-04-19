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
  const { user, partner, chores, dispatch } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chore = chores.find((c) => c.id === id);

  if (!user || !chore) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Paragraph typography="t5" color="#6b7280" textAlign="center">
          <Paragraph.Text>할 일을 찾을 수 없어요</Paragraph.Text>
        </Paragraph>
      </div>
    );
  }

  const isMyChore = chore.assignee_id === user.id;
  const isPartnerChore = partner && chore.assignee_id === partner.id;
  const needsMyApproval =
    chore.status === 'draft' &&
    chore.assignee_id === user.id &&
    chore.created_by_id !== user.id;

  const assigneeName = isMyChore ? '나' : (partner?.nickname ?? '파트너');

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError('오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDraft = () =>
    run(async () => {
      const updated = await acceptDraftChore(chore.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
    });

  const handleRejectDraft = () =>
    run(async () => {
      const updated = await rejectDraftChore(chore.id, chore.created_by_id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
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
      if (chore.status === 'reassigned') {
        navigate(`/thanks/${chore.id}`);
      }
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
        await declineHelpRequest(helpReq.id, user.id);
      }
      navigate('/home');
    });

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Button
          size="small"
          color="light"
          variant="weak"
          onClick={() => navigate('/home')}
        >
          &larr;
        </Button>
        <Paragraph typography="t4" fontWeight="bold" color="#111827">
          <Paragraph.Text>할 일 상세</Paragraph.Text>
        </Paragraph>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Chore title */}
        <Paragraph typography="t3" fontWeight="bold" color="#111827">
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
          <TableRow align="space-between" left="마감일" right={chore.due_date} />
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

        {/* Conditional action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* draft + needs my approval */}
          {needsMyApproval && (
            <>
              <Button
                size="xlarge"
                display="full"
                color="primary"
                variant="fill"
                onClick={handleAcceptDraft}
                disabled={loading}
                loading={loading}
              >
                수락하기
              </Button>
              <Button
                size="xlarge"
                display="full"
                color="light"
                variant="weak"
                onClick={handleRejectDraft}
                disabled={loading}
              >
                괜찮아요, 다음에
              </Button>
            </>
          )}

          {/* pending + my chore */}
          {chore.status === 'pending' && isMyChore && (
            <Button
              size="xlarge"
              display="full"
              color="primary"
              variant="fill"
              onClick={handleStart}
              disabled={loading}
              loading={loading}
            >
              시작하기
            </Button>
          )}

          {/* in_progress + my chore */}
          {chore.status === 'in_progress' && isMyChore && (
            <>
              <Button
                size="xlarge"
                display="full"
                color="primary"
                variant="fill"
                onClick={handleComplete}
                disabled={loading}
                loading={loading}
              >
                완료했어요
              </Button>
              <Button
                size="xlarge"
                display="full"
                color="light"
                variant="weak"
                onClick={handleRequestHelp}
                disabled={loading}
              >
                오늘 이 일, 도움 받을래요
              </Button>
            </>
          )}

          {/* help_requested + partner's chore */}
          {chore.status === 'help_requested' && isPartnerChore && (
            <>
              <Button
                size="xlarge"
                display="full"
                color="primary"
                variant="fill"
                onClick={handleTakeOver}
                disabled={loading}
                loading={loading}
              >
                내가 대신할게
              </Button>
              <Button
                size="xlarge"
                display="full"
                color="light"
                variant="weak"
                onClick={handleDeclineHelp}
                disabled={loading}
              >
                괜찮아요, 다음에
              </Button>
            </>
          )}

          {/* reassigned + my chore */}
          {chore.status === 'reassigned' && isMyChore && (
            <Button
              size="xlarge"
              display="full"
              color="primary"
              variant="fill"
              onClick={handleComplete}
              disabled={loading}
              loading={loading}
            >
              완료했어요
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
