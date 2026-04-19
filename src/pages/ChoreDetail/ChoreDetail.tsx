import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function ChoreDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, partner, chores, dispatch } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chore = chores.find((c) => c.id === id);

  if (!user || !chore) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        할 일을 찾을 수 없어요
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '20px 16px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={() => navigate('/home')}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '20px',
            padding: 0,
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
          할 일 상세
        </h1>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Chore info card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
            {chore.title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>상태</span>
              <span
                style={{
                  fontSize: '13px',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  backgroundColor: chore.status === 'help_requested' ? '#fed7aa' : '#f3f4f6',
                  color: chore.status === 'help_requested' ? '#c2410c' : '#374151',
                  fontWeight: 600,
                }}
              >
                {STATUS_LABELS[chore.status]}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>담당자</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{assigneeName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>마감일</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{chore.due_date}</span>
            </div>
          </div>
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        )}

        {/* Conditional action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* draft + needs my approval */}
          {needsMyApproval && (
            <>
              <button
                onClick={handleAcceptDraft}
                disabled={loading}
                style={primaryButtonStyle(loading)}
              >
                수락하기
              </button>
              <button
                onClick={handleRejectDraft}
                disabled={loading}
                style={secondaryButtonStyle(loading)}
              >
                괜찮아요, 다음에
              </button>
            </>
          )}

          {/* pending + my chore */}
          {chore.status === 'pending' && isMyChore && (
            <button
              onClick={handleStart}
              disabled={loading}
              style={primaryButtonStyle(loading)}
            >
              시작하기
            </button>
          )}

          {/* in_progress + my chore */}
          {chore.status === 'in_progress' && isMyChore && (
            <>
              <button
                onClick={handleComplete}
                disabled={loading}
                style={primaryButtonStyle(loading)}
              >
                완료했어요
              </button>
              <button
                onClick={handleRequestHelp}
                disabled={loading}
                style={secondaryButtonStyle(loading)}
              >
                오늘 이 일, 도움 받을래요
              </button>
            </>
          )}

          {/* help_requested + partner's chore (partner needs help, I can take over) */}
          {chore.status === 'help_requested' && isPartnerChore && (
            <>
              <button
                onClick={handleTakeOver}
                disabled={loading}
                style={primaryButtonStyle(loading)}
              >
                내가 대신할게
              </button>
              <button
                onClick={handleDeclineHelp}
                disabled={loading}
                style={secondaryButtonStyle(loading)}
              >
                괜찮아요, 다음에
              </button>
            </>
          )}

          {/* reassigned + my chore (I took it over) */}
          {chore.status === 'reassigned' && isMyChore && (
            <button
              onClick={handleComplete}
              disabled={loading}
              style={primaryButtonStyle(loading)}
            >
              완료했어요
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    fontSize: '16px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

function secondaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    fontSize: '16px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
