import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, Tab, SegmentedControl } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import { acceptReward, useReward } from '../../data/rewards';
import RewardCard from '../../components/RewardCard';
import EmptyState from '../../components/EmptyState';

type TabType = 'received' | 'sent';

export default function Rewards() {
  const { rewards, dispatch, refreshData } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('received');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleAccept = async (rewardId: string) => {
    setError(null);
    try {
      const updated = await acceptReward(rewardId);
      dispatch({ type: 'UPDATE_REWARD', payload: updated });
    } catch {
      setError('수락에 실패했어요. 다시 시도해주세요.');
    }
  };

  const handleUse = async (rewardId: string) => {
    setError(null);
    try {
      const updated = await useReward(rewardId);
      dispatch({ type: 'UPDATE_REWARD', payload: updated });
    } catch {
      setError('처리에 실패했어요. 다시 시도해주세요.');
    }
  };

  const currentList = tab === 'received' ? rewards.received : rewards.sent;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0', borderBottom: '1px solid #e5e7eb' }}>
        <Paragraph typography="t3" fontWeight="bold" color="#111827">
          <Paragraph.Text>감사 선물</Paragraph.Text>
        </Paragraph>
        <Spacing size={16} />
        <Tab onChange={(index) => setTab(index === 0 ? 'received' : 'sent')}>
          <Tab.Item selected={tab === 'received'}>받은 선물</Tab.Item>
          <Tab.Item selected={tab === 'sent'}>보낸 선물</Tab.Item>
        </Tab>
      </div>

      <div style={{ padding: '16px' }}>
        {error && (
          <>
            <Paragraph typography="t7" color="#dc2626">
              <Paragraph.Text>{error}</Paragraph.Text>
            </Paragraph>
            <Spacing size={12} />
          </>
        )}

        {currentList.length === 0 ? (
          <EmptyState message={tab === 'received' ? '받은 선물이 없어요' : '보낸 선물이 없어요'} />
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
            {currentList.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                isReceived={tab === 'received'}
                onAccept={() => handleAccept(reward.id)}
                onUse={() => handleUse(reward.id)}
              />
            ))}
          </div>
        )}
      </div>

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
        <SegmentedControl value="rewards" onChange={(v) => { if (v === 'home') navigate('/home'); }}>
          <SegmentedControl.Item value="home">홈</SegmentedControl.Item>
          <SegmentedControl.Item value="rewards">보상</SegmentedControl.Item>
        </SegmentedControl>
      </div>
    </div>
  );
}
