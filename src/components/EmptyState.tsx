import { Spacing, Text, Asset } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';

interface EmptyStateProps {
  message: string;
  icon?: string;
}

export default function EmptyState({ message, icon = 'icon-info-mono' }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <Asset.Icon
        frameShape={Asset.frameShape.SquareXLarge}
        name={icon}
        color={adaptive.grey300}
        aria-hidden
      />
      <Spacing size={12} />
      <Text color={adaptive.grey400} typography="t6">{message}</Text>
    </div>
  );
}
