import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { createChore } from '../../data/chores';

export default function ChoreCreate() {
  const { user, partner, dispatch } = useApp();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const effectiveAssigneeId = assigneeId || user.id;

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate || !user.couple_id) return;
    setLoading(true);
    setError(null);
    try {
      const chore = await createChore({
        couple_id: user.couple_id,
        title: title.trim(),
        created_by_id: user.id,
        assignee_id: effectiveAssigneeId,
        due_date: dueDate,
      });
      dispatch({ type: 'ADD_CHORE', payload: chore });
      navigate('/home');
    } catch {
      setError('할 일을 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '20px 16px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={() => navigate('/home')}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '20px',
            padding: 0,
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
          할 일 추가
        </h1>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            할 일 이름
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 설거지하기"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1.5px solid #e5e7eb',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        {/* Assignee */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            담당자
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setAssigneeId(user.id)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid',
                borderColor: effectiveAssigneeId === user.id ? '#3b82f6' : '#e5e7eb',
                backgroundColor: effectiveAssigneeId === user.id ? '#eff6ff' : '#ffffff',
                color: effectiveAssigneeId === user.id ? '#3b82f6' : '#374151',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '15px',
              }}
            >
              나
            </button>
            {partner && (
              <button
                onClick={() => setAssigneeId(partner.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '2px solid',
                  borderColor: effectiveAssigneeId === partner.id ? '#3b82f6' : '#e5e7eb',
                  backgroundColor: effectiveAssigneeId === partner.id ? '#eff6ff' : '#ffffff',
                  color: effectiveAssigneeId === partner.id ? '#3b82f6' : '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '15px',
                }}
              >
                {partner.nickname}
              </button>
            )}
          </div>
        </div>

        {/* Due Date */}
        <div style={{ marginBottom: '32px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            마감일
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1.5px solid #e5e7eb',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !dueDate}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            cursor: loading || !title.trim() || !dueDate ? 'not-allowed' : 'pointer',
            opacity: loading || !title.trim() || !dueDate ? 0.5 : 1,
          }}
        >
          {loading ? '추가 중...' : '할 일 추가하기'}
        </button>
      </div>
    </div>
  );
}
