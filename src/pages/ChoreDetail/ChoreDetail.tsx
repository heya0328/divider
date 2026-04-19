import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spacing, Badge, Button, Top, Text, List, ListRow, Paragraph } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
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
  const { user, partner, chores, dispatch } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelpReward, setShowHelpReward] = useState(false);
  const [helpReward, setHelpReward] = useState<{ type: 'template' | 'custom'; key?: string; text?: string } | null>(null);

  const chore = chores.find((c) => c.id === id);

  if (!user || !chore) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Text color={adaptive.grey500} typography="t5">할 일을 찾을 수 없어요</Text>
        <Spacing size={16} />
        <Button size="medium" color="primary" variant="fill" onClick={() => navigate('/home')}>홈으로</Button>
      </div>
    );
  }

  const isMyChore = chore.assignee_id === user.id;
  const isPartnerChore = partner != null && chore.assignee_id === partner.id;
  const needsMyApproval = chore.status === 'draft' && chore.assignee_id === user.id && chore.created_by_id !== user.id;
  const canSendThanks = chore.status === 'completed' && chore.original_assignee_id === user.id && chore.completed_by_id != null && chore.completed_by_id !== user.id;
  const assigneeName = isMyChore ? '나' : (partner?.nickname ?? '파트너');
  const completedByName = chore.completed_by_id === user.id ? '나' : (partner?.nickname ?? '파트너');

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
    try { await fn(); }
    catch (err) { setError(err instanceof Error ? err.message : '오류가 발생했어요.'); }
    finally { setLoading(false); }
  };

  const handleAcceptDraft = () => run(async () => {
    const updated = await acceptDraftChore(chore.id);
    dispatch({ type: 'UPDATE_CHORE', payload: updated });
  });
  const handleRejectDraft = () => run(async () => {
    await rejectDraftChore(chore.id);
    dispatch({ type: 'REMOVE_CHORE', payload: chore.id });
    navigate('/home');
  });
  const handleStart = () => run(async () => {
    const updated = await startChore(chore.id);
    dispatch({ type: 'UPDATE_CHORE', payload: updated });
  });
  const handleComplete = () => run(async () => {
    const updated = await completeChore(chore.id, user.id);
    dispatch({ type: 'UPDATE_CHORE', payload: updated });
    if (chore.status === 'reassigned' && chore.proposed_reward_type && chore.original_assignee_id !== user.id) {
      await createReward({
        chore_id: chore.id, giver_id: chore.original_assignee_id, receiver_id: user.id,
        type: chore.proposed_reward_type,
        template_key: chore.proposed_reward_key ?? undefined,
        custom_text: chore.proposed_reward_text ?? undefined,
      });
    }
    navigate('/home');
  });
  const handleRequestHelp = () => run(async () => {
    await createHelpRequest(chore.id, user.id);
    const updated = await requestHelp(chore.id, helpReward ?? undefined);
    dispatch({ type: 'UPDATE_CHORE', payload: updated });
    setShowHelpReward(false);
  });
  const handleTakeOver = () => run(async () => {
    const helpReq = await getPendingHelpRequest(chore.id);
    if (helpReq) await acceptHelpRequest(helpReq.id, user.id);
    const updated = await reassignChore(chore.id, user.id);
    dispatch({ type: 'UPDATE_CHORE', payload: updated });
  });
  const handleDeclineHelp = () => run(async () => {
    const helpReq = await getPendingHelpRequest(chore.id);
    if (helpReq) await declineHelpRequest(helpReq.id);
    const updated = await revertToInProgress(chore.id);
    dispatch({ type: 'UPDATE_CHORE', payload: updated });
    navigate('/home');
  });

  // Bottom CTA
  const renderBottomCTA = () => {
    const wrap = (children: React.ReactNode, accessory?: React.ReactNode) => (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', backgroundColor: adaptive.background, borderTop: `1px solid ${adaptive.grey100}` }}>
        {accessory && <>{accessory}<Spacing size={12} /></>}
        {children}
      </div>
    );
    const banner = (text: string, bg: string, fg: string) =>
      proposedRewardLabel ? (
        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: bg, borderRadius: '10px' }}>
          <Text color={fg} typography="t6" textAlign="center">{text}</Text>
        </div>
      ) : undefined;

    if (needsMyApproval) return wrap(
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button size="xlarge" display="full" color="light" variant="weak" onClick={handleRejectDraft} disabled={loading} style={{ flex: 1 }}>괜찮아요, 다음에</Button>
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleAcceptDraft} disabled={loading} loading={loading} style={{ flex: 1 }}>수락하기</Button>
      </div>,
      banner(`해주면 ${proposedRewardLabel} 받아요!`, adaptive.blue50, adaptive.blue500)
    );
    if (chore.status === 'pending' && isMyChore) return wrap(
      <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleStart} disabled={loading} loading={loading}>시작하기</Button>
    );
    if (chore.status === 'in_progress' && isMyChore && !showHelpReward) return wrap(
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button size="xlarge" display="full" color="light" variant="weak" onClick={() => setShowHelpReward(true)} disabled={loading} style={{ flex: 1 }}>도움 받을래요</Button>
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleComplete} disabled={loading} loading={loading} style={{ flex: 1 }}>완료했어요</Button>
      </div>
    );
    if (chore.status === 'help_requested' && isPartnerChore) return wrap(
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button size="xlarge" display="full" color="light" variant="weak" onClick={handleDeclineHelp} disabled={loading} style={{ flex: 1 }}>괜찮아요, 다음에</Button>
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleTakeOver} disabled={loading} loading={loading} style={{ flex: 1 }}>내가 대신할게</Button>
      </div>,
      banner(`대신 해주면 ${proposedRewardLabel} 받아요!`, adaptive.blue50, adaptive.blue500)
    );
    if (chore.status === 'reassigned' && isMyChore) return wrap(
      <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleComplete} disabled={loading} loading={loading}>완료했어요</Button>,
      banner(`완료하면 ${proposedRewardLabel} 받아요`, adaptive.yellow50, adaptive.orange700)
    );
    if (canSendThanks) return wrap(
      <Button size="xlarge" display="full" color="primary" variant="fill" onClick={() => navigate(`/thanks/${chore.id}`)}>감사 선물 보내기</Button>,
      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: adaptive.blue50, borderRadius: '12px' }}>
        <Text color={adaptive.blue500} typography="t6" textAlign="center">{partner?.nickname ?? '파트너'}님이 대신 해줬어요!</Text>
      </div>
    );
    return null;
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Header */}
      <Top
        title={
          <Top.TitleParagraph size={22} color={chore.status === 'completed' ? adaptive.grey400 : adaptive.grey900}>
            {chore.title}
          </Top.TitleParagraph>
        }
      />

      {/* 상태 배지 */}
      <div style={{ padding: '0 20px' }}>
        <Badge size="small" variant="fill" color={STATUS_COLORS[chore.status]}>
          {STATUS_LABELS[chore.status]}
        </Badge>
      </div>

      <Spacing size={24} />

      {/* 정보 카드 — List + ListRow */}
      <List>
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="담당자"
              topProps={{ color: adaptive.grey500 }}
              bottom={assigneeName}
              bottomProps={{ color: adaptive.grey900, fontWeight: 'bold' }}
            />
          }
        />
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="마감일"
              topProps={{ color: adaptive.grey500 }}
              bottom={chore.due_date ?? '없음'}
              bottomProps={{ color: chore.due_date ? adaptive.grey900 : adaptive.grey400, fontWeight: 'bold' }}
            />
          }
        />
        {chore.status === 'completed' && chore.completed_by_id && (
          <ListRow
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top="완료한 사람"
                topProps={{ color: adaptive.grey500 }}
                bottom={completedByName}
                bottomProps={{ color: adaptive.grey900, fontWeight: 'bold' }}
              />
            }
          />
        )}
      </List>

      {/* 제안된 보상 */}
      {proposedRewardLabel && (
        <>
          <Spacing size={12} />
          <List>
            <ListRow
              left={<span style={{ fontSize: '20px' }}>🎁</span>}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top="약속된 보상"
                  topProps={{ color: adaptive.grey500 }}
                  bottom={proposedRewardLabel}
                  bottomProps={{ color: adaptive.orange700, fontWeight: 'bold' }}
                />
              }
            />
          </List>
        </>
      )}

      {/* 에러 */}
      {error && (
        <div style={{ padding: '12px 20px' }}>
          <Text color={adaptive.red500} typography="t7">{error}</Text>
        </div>
      )}

      {/* 도움 요청 + 보상 설정 */}
      {chore.status === 'in_progress' && isMyChore && showHelpReward && (
        <div style={{ padding: '16px' }}>
          <div style={{ padding: '20px', backgroundColor: adaptive.grey50, borderRadius: '16px' }}>
            <Text color={adaptive.grey900} typography="t5" fontWeight="semibold">도움 요청 보내기</Text>
            <Spacing size={4} />
            <Text color={adaptive.grey500} typography="t7">보상을 제안하면 파트너가 더 기꺼이 도와줘요</Text>
            <Spacing size={16} />
            <RewardPicker onSelect={setHelpReward} />
          </div>
          <Spacing size={12} />
          <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleRequestHelp} disabled={loading} loading={loading}>
            {helpReward ? '보상과 함께 도움 요청하기' : '도움 요청하기'}
          </Button>
          <Spacing size={8} />
          <Button size="medium" display="full" color="light" variant="weak" onClick={() => setShowHelpReward(false)} disabled={loading}>
            취소
          </Button>
        </div>
      )}

      {/* Bottom CTA */}
      {!showHelpReward && renderBottomCTA()}
    </div>
  );
}
