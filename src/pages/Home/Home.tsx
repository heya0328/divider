import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import ChoreCard from '../../components/ChoreCard';
import EmptyState from '../../components/EmptyState';
import type { Chore } from '../../types';

export default function Home() {
  const { user, partner, chores, refreshData } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '80px' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '20px 16px 16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
          안녕하세요, {user.nickname}님 👋
        </h1>
      </div>

      <div style={{ padding: '16px' }}>
        {/* 수락 대기 중 */}
        {pendingApproval.length > 0 && (
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
              수락 대기 중
            </h2>
            {pendingApproval.map((chore) => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                currentUser={user}
                partner={partner}
                onClick={() => navigate(`/chore/${chore.id}`)}
              />
            ))}
          </section>
        )}

        {/* 내 할 일 */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            내 할 일
          </h2>
          {myChores.length === 0 ? (
            <EmptyState message="할 일이 없어요 🎉" />
          ) : (
            myChores.map((chore) => (
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

        {/* 파트너 할 일 */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            파트너 할 일
          </h2>
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
      <button
        onClick={() => navigate('/chore/create')}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: 'none',
          fontSize: '28px',
          fontWeight: 400,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
        }}
      >
        +
      </button>

      {/* Bottom Tab Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => navigate('/home')}
          style={{
            flex: 1,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            color: '#3b82f6',
          }}
        >
          <span style={{ fontSize: '20px' }}>🏠</span>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>홈</span>
        </button>
        <button
          onClick={() => navigate('/rewards')}
          style={{
            flex: 1,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            color: '#9ca3af',
          }}
        >
          <span style={{ fontSize: '20px' }}>🎁</span>
          <span style={{ fontSize: '11px', fontWeight: 500 }}>보상</span>
        </button>
      </div>
    </div>
  );
}
