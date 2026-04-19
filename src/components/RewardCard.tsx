import type { Reward, RewardStatus } from '../types';
import { REWARD_TEMPLATES } from '../constants';

interface RewardCardProps {
  reward: Reward;
  isReceived: boolean;
  onAccept?: () => void;
  onUse?: () => void;
}

const STATUS_LABELS: Record<RewardStatus, string> = {
  pending: '대기 중',
  accepted: '수락됨',
  used: '사용 완료',
};

export default function RewardCard({ reward, isReceived, onAccept, onUse }: RewardCardProps) {
  const template = REWARD_TEMPLATES.find((t) => t.key === reward.template_key);
  const displayText = template ? template.label : (reward.custom_text ?? '선물');
  const displayEmoji = template ? template.emoji : '🎁';

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>{displayEmoji}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>{displayText}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            {STATUS_LABELS[reward.status]}
          </div>
        </div>
      </div>
      <div>
        {isReceived && reward.status === 'pending' && onAccept && (
          <button
            onClick={onAccept}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            수락하기
          </button>
        )}
        {isReceived && reward.status === 'accepted' && onUse && (
          <button
            onClick={onUse}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            사용 완료
          </button>
        )}
      </div>
    </div>
  );
}
