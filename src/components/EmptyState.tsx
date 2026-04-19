interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: '40px',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '15px',
      }}
    >
      {message}
    </div>
  );
}
