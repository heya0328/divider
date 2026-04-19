import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spacing, Top, Tab, Text, Asset } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useApp } from '../../context/AppContext';
import { acceptReward, useReward } from '../../data/rewards';
import RewardCard from '../../components/RewardCard';

type TabType = 'received' | 'sent';

export default function Rewards() {
  const { rewards, dispatch, refreshData } = useApp();
  const navigate = useNavigate();
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

      <div style={{ padding: '0 16px' }}>
        <Tab onChange={(index) => setTab(index === 0 ? 'received' : 'sent')}>
          <Tab.Item selected={tab === 'received'}>받은 선물</Tab.Item>
          <Tab.Item selected={tab === 'sent'}>보낸 선물</Tab.Item>
        </Tab>
      </div>

      <Spacing size={8} />

      {error && (
        <div style={{ padding: '8px 16px' }}>
          <Text color={adaptive.red500} typography="t7">{error}</Text>
        </div>
      )}

      {currentList.length === 0 ? (
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <Text color={adaptive.grey400} typography="t6">
            {tab === 'received' ? '받은 선물이 없어요' : '보낸 선물이 없어요'}
          </Text>
        </div>
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

      {/* Bottom Tab */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', backgroundColor: '#fff', borderTop: `1px solid ${adaptive.grey100}`,
        padding: '8px 0 4px',
      }}>
        <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/home')}>
          <Asset.Icon frameShape={Asset.frameShape.CleanW24} name="icon-home-mono" color={adaptive.grey400} aria-hidden />
          <Text display="block" color={adaptive.grey600} typography="st13" fontWeight="medium" textAlign="center">홈</Text>
        </div>
        <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/rewards')}>
          <Asset.Icon frameShape={Asset.frameShape.CleanW24} name="icon-diamond-mono" color={adaptive.grey800} aria-hidden />
          <Text display="block" color={adaptive.grey900} typography="st13" fontWeight="medium" textAlign="center">보상</Text>
        </div>
      </div>
    </div>
  );
}
