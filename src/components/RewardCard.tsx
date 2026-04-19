import { Paragraph, Badge, Button, ListRow } from '@toss/tds-mobile';
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

  return (
    <ListRow
      border="none"
      left={<span style={{ fontSize: '28px', flexShrink: 0 }}>{displayEmoji}</span>}
      contents={
        <ListRow.Texts
          type="2RowTypeA"
          top={
            <Paragraph typography="t6" fontWeight="medium" color="#111827">
              <Paragraph.Text>{displayText}</Paragraph.Text>
            </Paragraph>
          }
          bottom={
            <Paragraph typography="t7" color="#9ca3af">
              <Paragraph.Text>{new Date(reward.created_at).toLocaleDateString('ko-KR')}</Paragraph.Text>
            </Paragraph>
          }
        />
      }
      right={
        <div style={{ flexShrink: 0 }}>
          {isReceived && reward.status === 'pending' && onAccept ? (
            <Button size="small" color="primary" variant="fill" onClick={(e) => { e.stopPropagation(); onAccept(); }}>
              수락하기
            </Button>
          ) : isReceived && reward.status === 'accepted' && onUse ? (
            <Button size="small" color="primary" variant="weak" onClick={(e) => { e.stopPropagation(); onUse(); }}>
              사용 완료
            </Button>
          ) : (
            <Badge size="small" variant="fill" color={STATUS_COLORS[reward.status]}>
              {STATUS_LABELS[reward.status]}
            </Badge>
          )}
        </div>
      }
    />
  );
}
