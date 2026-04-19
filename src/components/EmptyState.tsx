import { Spacing, Text } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <Spacing size={40} />
      <Text color={adaptive.grey400} typography="t6">{message}</Text>
      <Spacing size={40} />
    </div>
  );
}
