import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { acceptReward, useReward } from '../../data/rewards';
import RewardCard from '../../components/RewardCard';
import EmptyState from '../../components/EmptyState';

type Tab = 'received' | 'sent';

export default function Rewards() {
  const { rewards, dispatch } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('received');

  const handleAccept = async (rewardId: string) => {
    try {
      const updated = await acceptReward(rewardId);
      dispatch({ type: 'UPDATE_REWARD', payload: updated });
    } catch {
      // silent fail
    }
  };

  const handleUse = async (rewardId: string) => {
    try {
      const updated = await useReward(rewardId);
      dispatch({ type: 'UPDATE_REWARD', payload: updated });
    } catch {
      // silent fail
    }
  };

  const currentList = tab === 'received' ? rewards.received : rewards.sent;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '80px' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '20px 16px 0',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
          보상
        </h1>
        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          <button
            onClick={() => setTab('received')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              color: tab === 'received' ? '#3b82f6' : '#9ca3af',
              borderBottom: `2px solid ${tab === 'received' ? '#3b82f6' : 'transparent'}`,
            }}
          >
            받은 선물
          </button>
          <button
            onClick={() => setTab('sent')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              color: tab === 'sent' ? '#3b82f6' : '#9ca3af',
              borderBottom: `2px solid ${tab === 'sent' ? '#3b82f6' : 'transparent'}`,
            }}
          >
            보낸 선물
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {currentList.length === 0 ? (
          <EmptyState
            message={tab === 'received' ? '받은 선물이 없어요' : '보낸 선물이 없어요'}
          />
        ) : (
          currentList.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              isReceived={tab === 'received'}
              onAccept={tab === 'received' ? () => handleAccept(reward.id) : undefined}
              onUse={tab === 'received' ? () => handleUse(reward.id) : undefined}
            />
          ))
        )}
      </div>

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
            color: '#9ca3af',
          }}
        >
          <span style={{ fontSize: '20px' }}>🏠</span>
          <span style={{ fontSize: '11px', fontWeight: 500 }}>홈</span>
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
            color: '#3b82f6',
          }}
        >
          <span style={{ fontSize: '20px' }}>🎁</span>
          <span style={{ fontSize: '11px', fontWeight: 600 }}>보상</span>
        </button>
      </div>
    </div>
  );
}
