import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spacing, Top, List, ListRow, Text, Asset, Button, useDialog } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useApp } from '../../context/AppContext';
import { revertToInProgress, completeChore } from '../../data/chores';
import { expireOldHelpRequests } from '../../data/helpRequests';
import ChoreCard from '../../components/ChoreCard';
import type { Chore } from '../../types';

export default function Home() {
  const { user, partner, chores, dispatch, refreshData } = useApp();
  const navigate = useNavigate();
  const dialog = useDialog();

  const loadData = useCallback(async () => {
    await refreshData();
    for (const c of chores.filter(ch => ch.status === 'help_requested')) {
      const expired = await expireOldHelpRequests(c.id);
      if (expired) await revertToInProgress(c.id);
    }
    await refreshData();
  }, [refreshData, chores]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const pendingApproval = chores.filter(
    c => c.status === 'draft' && c.assignee_id === user.id && c.created_by_id !== user.id
  );
  const myChores = chores.filter(
    c => c.assignee_id === user.id && c.status !== 'draft' && c.status !== 'completed'
  );
  const partnerChores = chores.filter(
    c => partner && c.assignee_id === partner.id && c.status !== 'draft' && c.status !== 'completed'
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

  const totalActive = myChores.length + partnerChores.length + pendingApproval.length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Title */}
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            {`오늘의 우리 집안일 ${totalActive}개`}
          </Top.TitleParagraph>
        }
        right={
          <Button size="small" color="light" variant="weak" onClick={() => {
            localStorage.removeItem('divider_dev_user_id');
            window.location.href = '/';
          }}>
            초기화
          </Button>
        }
      />

      {/* 감사 전하기 */}
      {needsThanks.length > 0 && (
        <>
          <Spacing size={8} />
          <List>
            {needsThanks.map(chore => (
              <ListRow
                key={chore.id}
                onClick={() => navigate(`/thanks/${chore.id}`)}
                left={<span style={{ fontSize: '20px' }}>🙏</span>}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${partner?.nickname ?? '파트너'}님이 대신 해줬어요`}
                    topProps={{ color: adaptive.blue500, fontWeight: 'bold' }}
                    bottom={chore.title}
                    bottomProps={{ color: adaptive.grey600 }}
                  />
                }
                arrowType="right"
                verticalPadding="large"
              />
            ))}
          </List>
        </>
      )}

      {/* 수락 대기 중 */}
      {pendingApproval.length > 0 && (
        <>
          <Spacing size={16} />
          <div style={{ padding: '0 16px' }}>
            <Text color={adaptive.red500} typography="t6" fontWeight="semibold">
              수락 대기 중 {pendingApproval.length}
            </Text>
          </div>
          <Spacing size={4} />
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
      <Spacing size={16} />
      <div style={{ padding: '0 16px' }}>
        <Text color={adaptive.grey900} typography="t6" fontWeight="semibold">
          내 할 일 {myChores.length}
        </Text>
      </div>
      <Spacing size={4} />
      {myChores.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <Text color={adaptive.grey400} typography="t6">할 일이 없어요</Text>
        </div>
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
      <Spacing size={16} />
      <div style={{ padding: '0 16px' }}>
        <Text color={adaptive.grey900} typography="t6" fontWeight="semibold">
          파트너 할 일 {partnerChores.length}
        </Text>
      </div>
      <Spacing size={4} />
      {partnerChores.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <Text color={adaptive.grey400} typography="t6">
            {partner ? '파트너에게 할 일이 없어요' : '파트너와 연결해주세요'}
          </Text>
        </div>
      ) : (
        <>
          {partnerChores.map(chore => (
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

      {/* Bottom Tab */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', backgroundColor: '#fff', borderTop: `1px solid ${adaptive.grey100}`,
        padding: '8px 0 4px',
      }}>
        <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/home')}>
          <Asset.Icon frameShape={Asset.frameShape.CleanW24} name="icon-home-mono" color={adaptive.grey800} aria-hidden />
          <Text display="block" color={adaptive.grey900} typography="st13" fontWeight="medium" textAlign="center">홈</Text>
        </div>
        <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/rewards')}>
          <Asset.Icon frameShape={Asset.frameShape.CleanW24} name="icon-diamond-mono" color={adaptive.grey400} aria-hidden />
          <Text display="block" color={adaptive.grey600} typography="st13" fontWeight="medium" textAlign="center">보상</Text>
        </div>
      </div>
    </div>
  );
}
