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
import { createReward } from '../../data/rewards';
import { REWARD_TEMPLATES } from '../../constants';
import RewardPicker from '../../components/RewardPicker';
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
  const [showHelpReward, setShowHelpReward] = useState(false);
  const [helpReward, setHelpReward] = useState<{ type: 'template' | 'custom'; key?: string; text?: string } | null>(null);

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

  const needsMyApproval =
    chore.status === 'draft' &&
    chore.assignee_id === user.id &&
    chore.created_by_id !== user.id;

  const canSendThanks =
    chore.status === 'completed' &&
    chore.original_assignee_id === user.id &&
    chore.completed_by_id != null &&
    chore.completed_by_id !== user.id;

  const assigneeName = isMyChore ? '나' : (partner?.nickname ?? '파트너');

  // 제안된 보상 표시 텍스트
  const proposedRewardLabel = (() => {
    if (!chore.proposed_reward_type) return null;
    if (chore.proposed_reward_type === 'template' && chore.proposed_reward_key) {
      const t = REWARD_TEMPLATES.find(r => r.key === chore.proposed_reward_key);
      return t ? `${t.emoji} ${t.label}` : null;
    }
    if (chore.proposed_reward_type === 'custom' && chore.proposed_reward_text) {
      return `✍️ ${chore.proposed_reward_text}`;
    }
    return null;
  })();

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

  const handleAcceptDraft = () =>
    run(async () => {
      const updated = await acceptDraftChore(chore.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
    });

  const handleRejectDraft = () =>
    run(async () => {
      await rejectDraftChore(chore.id);
      dispatch({ type: 'REMOVE_CHORE', payload: chore.id });
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

      // 재할당된 할일 완료 시, 제안된 보상이 있으면 자동 생성
      if (chore.status === 'reassigned' && chore.proposed_reward_type && chore.original_assignee_id !== user.id) {
        await createReward({
          chore_id: chore.id,
          giver_id: chore.original_assignee_id,
          receiver_id: user.id,
          type: chore.proposed_reward_type,
          template_key: chore.proposed_reward_key ?? undefined,
          custom_text: chore.proposed_reward_text ?? undefined,
        });
      }

      navigate('/home');
    });

  const handleRequestHelp = () =>
    run(async () => {
      await createHelpRequest(chore.id, user.id);
      const updated = await requestHelp(chore.id, helpReward ?? undefined);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
      setShowHelpReward(false);
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
      const updated = await revertToInProgress(chore.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
      navigate('/home');
    });

  // Bottom CTA renderer
  const renderBottomCTA = () => {
    const wrap = (children: React.ReactNode, accessory?: React.ReactNode) => (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', backgroundColor: '#fff', borderTop: '1px solid #f3f4f6' }}>
        {accessory && <>{accessory}<Spacing size={12} /></>}
        {children}
      </div>
    );

    const rewardBanner = (text: string, bg: string, color: string) =>
      proposedRewardLabel ? (
        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: bg, borderRadius: '10px' }}>
          <Paragraph typography="t6" color={color} textAlign="center">
            <Paragraph.Text>{text}</Paragraph.Text>
          </Paragraph>
        </div>
      ) : undefined;

    if (needsMyApproval) {
      return wrap(
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="xlarge" display="full" color="light" variant="weak" onClick={handleRejectDraft} disabled={loading} style={{ flex: 1 }}>
            괜찮아요, 다음에
          </Button>
          <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleAcceptDraft} disabled={loading} loading={loading} style={{ flex: 1 }}>
            수락하기
          </Button>
        </div>,
        rewardBanner(`해주면 ${proposedRewardLabel} 받아요!`, '#eff6ff', '#3182f6')
      );
    }

    if (chore.status === 'pending' && isMyChore) {
      return wrap(
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleStart} disabled={loading} loading={loading}>
          시작하기
        </Button>
      );
    }

    if (chore.status === 'in_progress' && isMyChore && !showHelpReward) {
      return wrap(
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="xlarge" display="full" color="light" variant="weak" onClick={() => setShowHelpReward(true)} disabled={loading} style={{ flex: 1 }}>
            도움 받을래요
          </Button>
          <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleComplete} disabled={loading} loading={loading} style={{ flex: 1 }}>
            완료했어요
          </Button>
        </div>
      );
    }

    if (chore.status === 'help_requested' && isPartnerChore) {
      return wrap(
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="xlarge" display="full" color="light" variant="weak" onClick={handleDeclineHelp} disabled={loading} style={{ flex: 1 }}>
            괜찮아요, 다음에
          </Button>
          <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleTakeOver} disabled={loading} loading={loading} style={{ flex: 1 }}>
            내가 대신할게
          </Button>
        </div>,
        rewardBanner(`대신 해주면 ${proposedRewardLabel} 받아요!`, '#eff6ff', '#3182f6')
      );
    }

    if (chore.status === 'reassigned' && isMyChore) {
      return wrap(
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleComplete} disabled={loading} loading={loading}>
          완료했어요
        </Button>,
        rewardBanner(`완료하면 ${proposedRewardLabel} 받아요`, '#fef3c7', '#92400e')
      );
    }

    if (canSendThanks) {
      return wrap(
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={() => navigate(`/thanks/${chore.id}`)}>
          감사 선물 보내기
        </Button>,
        <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '12px' }}>
          <Paragraph typography="t6" color="#3182f6" textAlign="center">
            <Paragraph.Text>{partner?.nickname ?? '파트너'}님이 대신 해줬어요!</Paragraph.Text>
          </Paragraph>
        </div>
      );
    }

    return null;
  };

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
        <Paragraph typography="t3" fontWeight="bold" color={chore.status === 'completed' ? '#9ca3af' : '#111827'}>
          <Paragraph.Text>{chore.title}</Paragraph.Text>
        </Paragraph>

        <Spacing size={20} />

        {/* Info */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <TableRow align="space-between" left="상태" right={
            <Badge size="small" variant="fill" color={STATUS_COLORS[chore.status]}>
              {STATUS_LABELS[chore.status]}
            </Badge>
          } />
          <TableRow align="space-between" left="담당자" right={assigneeName} />
          <TableRow align="space-between" left="마감일" right={chore.due_date ?? '없음'} />
          {chore.status === 'completed' && chore.completed_by_id && (
            <TableRow align="space-between" left="완료한 사람"
              right={chore.completed_by_id === user.id ? '나' : (partner?.nickname ?? '파트너')} />
          )}
        </div>

        {/* 제안된 보상 표시 */}
        {proposedRewardLabel && (
          <>
            <Spacing size={16} />
            <div style={{ padding: '14px 16px', backgroundColor: '#fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Paragraph typography="t6" fontWeight="medium" color="#92400e">
                <Paragraph.Text>보상: {proposedRewardLabel}</Paragraph.Text>
              </Paragraph>
            </div>
          </>
        )}

        <Spacing size={24} />

        {error && (
          <>
            <Paragraph typography="t7" color="#dc2626">
              <Paragraph.Text>{error}</Paragraph.Text>
            </Paragraph>
            <Spacing size={12} />
          </>
        )}

        {/* 도움 요청 + 보상 설정 UI (inline, not in bottom CTA) */}
        {chore.status === 'in_progress' && isMyChore && showHelpReward && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <Paragraph typography="t5" fontWeight="semibold" color="#111827">
                <Paragraph.Text>도움 요청 보내기</Paragraph.Text>
              </Paragraph>
              <Spacing size={4} />
              <Paragraph typography="t7" color="#6b7280">
                <Paragraph.Text>보상을 제안하면 파트너가 더 기꺼이 도와줘요</Paragraph.Text>
              </Paragraph>
              <Spacing size={16} />
              <RewardPicker onSelect={setHelpReward} />
            </div>
            <Spacing size={4} />
            <Button size="xlarge" display="full" color="primary" variant="fill"
              onClick={handleRequestHelp} disabled={loading} loading={loading}>
              {helpReward ? '보상과 함께 도움 요청하기' : '도움 요청하기'}
            </Button>
            <Button size="medium" display="full" color="light" variant="weak"
              onClick={() => setShowHelpReward(false)} disabled={loading}>
              취소
            </Button>
          </div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      {!showHelpReward && renderBottomCTA()}
    </div>
  );
}
