import { Navigate, useParams } from 'react-router-dom';

export function HelpRequest() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/chore/${id}`} replace />;
}
