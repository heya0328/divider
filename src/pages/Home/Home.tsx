import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, Badge, Button, SegmentedControl, ListRow } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import { revertToInProgress, completeChore } from '../../data/chores';
import { expireOldHelpRequests } from '../../data/helpRequests';
import ChoreCard from '../../components/ChoreCard';
import EmptyState from '../../components/EmptyState';
import type { Chore } from '../../types';

export default function Home() {
  const { user, partner, chores, dispatch, refreshData } = useApp();
  const navigate = useNavigate();

  // 로드 시 만료된 도움 요청 자동 처리
  const loadData = useCallback(async () => {
    await refreshData();

    // help_requested 상태인 chore들의 만료 체크
    for (const c of chores.filter(ch => ch.status === 'help_requested')) {
      const expired = await expireOldHelpRequests(c.id);
      if (expired) {
        await revertToInProgress(c.id);
      }
    }
    // 만료 처리 후 다시 로드
    await refreshData();
  }, [refreshData, chores]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  // "수락 대기 중": draft chores assigned to me, created by partner
  const pendingApproval: Chore[] = chores.filter(
    (c) =>
      c.status === 'draft' &&
      c.assignee_id === user.id &&
      c.created_by_id !== user.id
  );

  // "내 할 일": my active chores (not draft, not completed)
  const myChores: Chore[] = chores.filter(
    (c) =>
      c.assignee_id === user.id &&
      c.status !== 'draft' &&
      c.status !== 'completed'
  );

  // "파트너 할 일": partner's active chores (not draft, not completed)
  const partnerChores: Chore[] = chores.filter(
    (c) =>
      partner &&
      c.assignee_id === partner.id &&
      c.status !== 'draft' &&
      c.status !== 'completed'
  );

  // "감사 전하기": 파트너가 대신 완료한 내 할일 (아직 감사 안 보낸 것)
  const needsThanks: Chore[] = chores.filter(
    (c) =>
      c.status === 'completed' &&
      c.original_assignee_id === user.id &&
      c.completed_by_id != null &&
      c.completed_by_id !== user.id
  );

  const handleCompleteChore = async (chore: Chore) => {
    try {
      const updated = await completeChore(chore.id, user.id);
      dispatch({ type: 'UPDATE_CHORE', payload: updated });
    } catch {
      // Silently fail — user can retry via detail page
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Paragraph typography="t3" fontWeight="bold" color="#111827">
          <Paragraph.Text>오늘의 우리 집안일</Paragraph.Text>
        </Paragraph>
        <Button
          size="small"
          color="light"
          variant="weak"
          onClick={() => {
            localStorage.removeItem('divider_dev_user_id');
            window.location.href = '/';
          }}
        >
          초기화
        </Button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* 감사 전하기 */}
        {needsThanks.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Paragraph typography="t5" fontWeight="semibold" color="#3182f6">
                <Paragraph.Text>감사를 전해보세요</Paragraph.Text>
              </Paragraph>
              <Badge size="small" variant="fill" color="blue">
                {needsThanks.length}
              </Badge>
            </div>
            <Spacing size={8} />
            {needsThanks.map((chore) => (
              <ListRow
                key={chore.id}
                onClick={() => navigate(`/thanks/${chore.id}`)}
                withArrow
                withTouchEffect
                border="none"
                left={<span style={{ fontSize: '20px' }}>🙏</span>}
                contents={
                  <Paragraph typography="t6" fontWeight="medium" color="#111827">
                    <Paragraph.Text>{partner?.nickname ?? '파트너'}님이 '{chore.title}'을 해줬어요</Paragraph.Text>
                  </Paragraph>
                }
                right={
                  <Paragraph typography="t7" color="#3182f6" fontWeight="semibold">
                    <Paragraph.Text>감사 보내기</Paragraph.Text>
                  </Paragraph>
                }
                style={{ backgroundColor: '#eff6ff', borderRadius: '8px', marginBottom: '4px' }}
              />
            ))}
            <Spacing size={24} />
          </section>
        )}

        {/* 수락 대기 중 */}
        {pendingApproval.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Paragraph typography="t5" fontWeight="semibold" color="#374151">
                <Paragraph.Text>수락 대기 중</Paragraph.Text>
              </Paragraph>
              <Badge size="small" variant="fill" color="red">
                {pendingApproval.length}
              </Badge>
            </div>
            <Spacing size={12} />
            {pendingApproval.map((chore) => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                currentUser={user}
                partner={partner}
                onClick={() => navigate(`/chore/${chore.id}`)}
              />
            ))}
            <Spacing size={24} />
          </section>
        )}

        {/* 내 할 일 */}
        <section>
          <Paragraph typography="t5" fontWeight="semibold" color="#374151">
            <Paragraph.Text>내 할 일</Paragraph.Text>
          </Paragraph>
          <Spacing size={12} />
          {myChores.length === 0 ? (
            <EmptyState message="할 일이 없어요" />
          ) : (
            myChores.map((chore) => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                currentUser={user}
                partner={partner}
                onClick={() => navigate(`/chore/${chore.id}`)}
                onComplete={() => handleCompleteChore(chore)}
              />
            ))
          )}
          <Spacing size={24} />
        </section>

        {/* 파트너 할 일 */}
        <section>
          <Paragraph typography="t5" fontWeight="semibold" color="#374151">
            <Paragraph.Text>파트너 할 일</Paragraph.Text>
          </Paragraph>
          <Spacing size={12} />
          {partnerChores.length === 0 ? (
            <EmptyState message={partner ? '파트너에게 할 일이 없어요' : '파트너와 연결해주세요'} />
          ) : (
            partnerChores.map((chore) => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                currentUser={user}
                partner={partner}
                onClick={() => navigate(`/chore/${chore.id}`)}
              />
            ))
          )}
        </section>
      </div>

      {/* FAB */}
      <Button
        size="large"
        color="primary"
        variant="fill"
        onClick={() => navigate('/chore/create')}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          padding: 0,
          minWidth: 'unset',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
        }}
      >
        +
      </Button>

      {/* Bottom Tab Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTop: '1px solid #e5e7eb',
          padding: '8px 16px',
        }}
      >
        <SegmentedControl value="home" onChange={(v) => { if (v === 'rewards') navigate('/rewards'); }}>
          <SegmentedControl.Item value="home">홈</SegmentedControl.Item>
          <SegmentedControl.Item value="rewards">보상</SegmentedControl.Item>
        </SegmentedControl>
      </div>
    </div>
  );
}
