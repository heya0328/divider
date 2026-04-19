import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spacing, Top, List, ListRow, ListHeader, Text, Asset, Button, useDialog } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useApp } from '../../context/AppContext';
import { revertToInProgress, completeChore } from '../../data/chores';
import { expireOldHelpRequests } from '../../data/helpRequests';
import { syncRecurringChores } from '../../data/choreTemplates';
import ChoreCard from '../../components/ChoreCard';
import EmptyState from '../../components/EmptyState';
import BottomTab from '../../components/BottomTab';
import type { Chore } from '../../types';

export default function Home() {
  const { user, partner, chores, dispatch, refreshData } = useApp();
  const navigate = useNavigate();
  const dialog = useDialog();

  const loadData = useCallback(async () => {
    await refreshData();
    if (user?.couple_id) {
      const created = await syncRecurringChores(user.couple_id);
      if (created > 0) await refreshData();
    }
    for (const c of chores.filter(ch => ch.status === 'help_requested')) {
      const expired = await expireOldHelpRequests(c.id);
      if (expired) await revertToInProgress(c.id);
    }
    await refreshData();
  }, [refreshData, chores, user?.couple_id]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const pendingApproval = chores.filter(
    c => c.status === 'draft' && c.assignee_id === user.id && c.created_by_id !== user.id
  );
  const myChores = chores.filter(
    c => c.assignee_id === user.id && c.status !== 'draft'
  );
  const partnerChores = chores.filter(
    c => partner && c.assignee_id === partner.id && c.status !== 'draft'
  );
  const needsThanks = chores.filter(
    c => c.status === 'completed' && c.original_assignee_id === user.id &&
      c.completed_by_id != null && c.completed_by_id !== user.id
  );

  const handleCheckClick = async (chore: Chore) => {
    const confirmed = await dialog.openConfirm({
      title: '완료하시겠어요?',
      description: `'${chore.title}'을 완료로 표시할까요?`,
      confirmButton: '완료하기',
      cancelButton: '취소',
    });

    if (confirmed) {
      try {
        const updated = await completeChore(chore.id, user.id);
        dispatch({ type: 'UPDATE_CHORE', payload: updated });
      } catch { /* retry via detail page */ }
    }
  };

  const totalActive = myChores.filter(c => c.status !== 'completed').length
    + partnerChores.filter(c => c.status !== 'completed').length
    + pendingApproval.length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            {`오늘의 우리 집안일 ${totalActive}개`}
          </Top.TitleParagraph>
        }
      />

      {/* 감사 전하기 */}
      {needsThanks.length > 0 && (
        <>
          <div style={{
            margin: '0 20px',
            padding: '16px',
            backgroundColor: adaptive.blue50,
            borderRadius: '16px',
          }}>
            {needsThanks.map(chore => (
              <div
                key={chore.id}
                onClick={() => navigate(`/thanks/${chore.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '24px' }}>🙏</span>
                <div style={{ flex: 1 }}>
                  <Text typography="t6" fontWeight="bold" color={adaptive.blue500}>
                    {`${partner?.nickname ?? '파트너'}님이 대신 해줬어요`}
                  </Text>
                  <Text typography="t7" color={adaptive.grey500}>{chore.title}</Text>
                </div>
                <Asset.Icon
                  frameShape={Asset.frameShape.CleanW24}
                  name="icon-arrow-right-mono"
                  color={adaptive.blue400}
                  aria-hidden
                />
              </div>
            ))}
          </div>
          <Spacing size={8} />
        </>
      )}

      {/* 수락 대기 중 */}
      {pendingApproval.length > 0 && (
        <>
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" color={adaptive.red500} fontWeight="bold">
                {`수락 대기 중 ${pendingApproval.length}`}
              </ListHeader.TitleParagraph>
            }
          />
          {pendingApproval.map(chore => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              currentUser={user}
              partner={partner}
              onClick={() => navigate(`/chore/${chore.id}`)}
            />
          ))}
        </>
      )}

      {/* 내 할 일 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            {`내 할 일 ${myChores.length}`}
          </ListHeader.TitleParagraph>
        }
      />
      {myChores.length === 0 ? (
        <EmptyState message="할 일이 없어요" icon="icon-check-mono" />
      ) : (
        myChores.map(chore => (
          <ChoreCard
            key={chore.id}
            chore={chore}
            currentUser={user}
            partner={partner}
            onClick={() => navigate(`/chore/${chore.id}`)}
            onCheckClick={() => handleCheckClick(chore)}
          />
        ))
      )}

      {/* 파트너 할 일 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            {`파트너 할 일 ${partnerChores.length}`}
          </ListHeader.TitleParagraph>
        }
      />
      {partnerChores.length === 0 ? (
        <EmptyState
          message={partner ? '파트너에게 할 일이 없어요' : '파트너와 연결해주세요'}
          icon="icon-person-mono"
        />
      ) : (
        partnerChores.map(chore => (
          <ChoreCard
            key={chore.id}
            chore={chore}
            currentUser={user}
            partner={partner}
            onClick={() => navigate(`/chore/${chore.id}`)}
          />
        ))
      )}

      {/* FAB */}
      <div
        onClick={() => navigate('/chore/create')}
        style={{
          position: 'fixed',
          bottom: '88px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: adaptive.blue500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(49, 130, 246, 0.4)',
          cursor: 'pointer',
        }}
      >
        <Asset.Icon frameShape={Asset.frameShape.CleanW24} name="icon-plus-mono" color="#fff" aria-hidden />
      </div>

      <BottomTab />
    </div>
  );
}
