import { useState, useEffect } from 'react';
import { Spacing, Top, Tab, Text } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useApp } from '../../context/AppContext';
import { acceptReward, useReward } from '../../data/rewards';
import RewardCard from '../../components/RewardCard';
import EmptyState from '../../components/EmptyState';
import BottomTab from '../../components/BottomTab';

type TabType = 'received' | 'sent';

export default function Rewards() {
  const { rewards, dispatch, refreshData } = useApp();
  const [tab, setTab] = useState<TabType>('received');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { refreshData(); }, [refreshData]);

  const handleAccept = async (rewardId: string) => {
    setError(null);
    try {
      const updated = await acceptReward(rewardId);
      dispatch({ type: 'UPDATE_REWARD', payload: updated });
    } catch { setError('수락에 실패했어요.'); }
  };

  const handleUse = async (rewardId: string) => {
    setError(null);
    try {
      const updated = await useReward(rewardId);
      dispatch({ type: 'UPDATE_REWARD', payload: updated });
    } catch { setError('처리에 실패했어요.'); }
  };

  const currentList = tab === 'received' ? rewards.received : rewards.sent;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            감사 선물
          </Top.TitleParagraph>
        }
      />

      <div style={{ padding: '0 20px' }}>
        <Tab onChange={(index) => setTab(index === 0 ? 'received' : 'sent')}>
          <Tab.Item selected={tab === 'received'}>받은 선물</Tab.Item>
          <Tab.Item selected={tab === 'sent'}>보낸 선물</Tab.Item>
        </Tab>
      </div>

      <Spacing size={8} />

      {error && (
        <div style={{ padding: '8px 20px' }}>
          <Text color={adaptive.red500} typography="t7">{error}</Text>
        </div>
      )}

      {currentList.length === 0 ? (
        <EmptyState
          message={tab === 'received' ? '받은 선물이 없어요' : '보낸 선물이 없어요'}
          icon="icon-diamond-mono"
        />
      ) : (
        currentList.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            isReceived={tab === 'received'}
            onAccept={() => handleAccept(reward.id)}
            onUse={() => handleUse(reward.id)}
          />
        ))
      )}

      <BottomTab />
    </div>
  );
}
