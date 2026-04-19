import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, Tab, Button } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import { acceptReward, useReward } from '../../data/rewards';
import RewardCard from '../../components/RewardCard';
import EmptyState from '../../components/EmptyState';

type TabType = 'received' | 'sent';

export default function Rewards() {
  const { rewards, dispatch } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('received');

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
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0', borderBottom: '1px solid #e5e7eb' }}>
        <Paragraph typography="t3" fontWeight="bold" color="#111827">
          <Paragraph.Text>보상</Paragraph.Text>
        </Paragraph>
        <Spacing size={16} />

        {/* Tabs */}
        <Tab onChange={(index) => setTab(index === 0 ? 'received' : 'sent')}>
          <Tab.Item selected={tab === 'received'}>
            받은 선물
          </Tab.Item>
          <Tab.Item selected={tab === 'sent'}>
            보낸 선물
          </Tab.Item>
        </Tab>
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
        <Button
          size="medium"
          color="light"
          variant="weak"
          display="full"
          onClick={() => navigate('/home')}
          style={{ flex: 1, flexDirection: 'column', gap: '2px', border: 'none' }}
        >
          홈
        </Button>
        <Button
          size="medium"
          color="primary"
          variant="weak"
          display="full"
          onClick={() => navigate('/rewards')}
          style={{ flex: 1, flexDirection: 'column', gap: '2px', border: 'none' }}
        >
          보상
        </Button>
      </div>
    </div>
  );
}
