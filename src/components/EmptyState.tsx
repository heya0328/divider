import { Paragraph, Spacing } from '@toss/tds-mobile';

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <Spacing size={40} />
      <Paragraph typography="t6" color="grey600">
        <Paragraph.Text>{message}</Paragraph.Text>
      </Paragraph>
      <Spacing size={40} />
    </div>
  );
}
