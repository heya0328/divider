import { ListRow, Badge, Button } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
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

const STATUS_COLORS: Record<RewardStatus, 'blue' | 'green' | 'elephant'> = {
  pending: 'elephant',
  accepted: 'blue',
  used: 'green',
};

export default function RewardCard({ reward, isReceived, onAccept, onUse }: RewardCardProps) {
  const template = REWARD_TEMPLATES.find(t => t.key === reward.template_key);
  const displayText = template ? template.label : (reward.custom_text ?? '선물');
  const displayEmoji = template ? template.emoji : '🎁';
  const dateText = new Date(reward.created_at).toLocaleDateString('ko-KR');

  return (
    <ListRow
      left={<span style={{ fontSize: '28px' }}>{displayEmoji}</span>}
      contents={
        <ListRow.Texts
          type="2RowTypeA"
          top={displayText}
          topProps={{ color: adaptive.grey800, fontWeight: 'bold' }}
          bottom={dateText}
          bottomProps={{ color: adaptive.grey600 }}
        />
      }
      right={
        isReceived && reward.status === 'pending' && onAccept ? (
          <Button size="small" color="primary" variant="fill" onClick={(e) => { e.stopPropagation(); onAccept(); }}>
            수락
          </Button>
        ) : isReceived && reward.status === 'accepted' && onUse ? (
          <Button size="small" color="primary" variant="weak" onClick={(e) => { e.stopPropagation(); onUse(); }}>
            사용 완료
          </Button>
        ) : (
          <Badge size="small" variant="fill" color={STATUS_COLORS[reward.status]}>
            {STATUS_LABELS[reward.status]}
          </Badge>
        )
      }
      verticalPadding="large"
    />
  );
}
