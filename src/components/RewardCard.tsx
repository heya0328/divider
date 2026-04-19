import { ListRow, Badge, Button } from '@toss/tds-mobile';
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

const STATUS_COLORS: Record<RewardStatus, 'blue' | 'teal' | 'green' | 'red' | 'yellow' | 'elephant'> = {
  pending: 'elephant',
  accepted: 'blue',
  used: 'green',
};

export default function RewardCard({ reward, isReceived, onAccept, onUse }: RewardCardProps) {
  const template = REWARD_TEMPLATES.find((t) => t.key === reward.template_key);
  const displayText = template ? template.label : (reward.custom_text ?? '선물');
  const displayEmoji = template ? template.emoji : '🎁';

  const actionButton = (() => {
    if (isReceived && reward.status === 'pending' && onAccept) {
      return (
        <Button size="small" color="primary" variant="fill" onClick={onAccept}>
          수락하기
        </Button>
      );
    }
    if (isReceived && reward.status === 'accepted' && onUse) {
      return (
        <Button size="small" color="primary" variant="weak" onClick={onUse}>
          사용 완료
        </Button>
      );
    }
    return (
      <Badge size="small" variant="fill" color={STATUS_COLORS[reward.status]}>
        {STATUS_LABELS[reward.status]}
      </Badge>
    );
  })();

  return (
    <ListRow
      left={<span style={{ fontSize: 28 }}>{displayEmoji}</span>}
      contents={
        <ListRow.Texts
          type="2RowTypeA"
          top={displayText}
          bottom={STATUS_LABELS[reward.status]}
        />
      }
      right={actionButton}
    />
  );
}
