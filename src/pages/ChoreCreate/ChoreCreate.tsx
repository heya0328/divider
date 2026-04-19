import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, TextField, Button } from '@toss/tds-mobile';
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

  // Check if user has matched with a partner
  if (!user.couple_id) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Paragraph typography="t4" fontWeight="bold" color="#111827" textAlign="center">
          <Paragraph.Text>파트너와 먼저 연결해주세요</Paragraph.Text>
        </Paragraph>
        <Spacing size={12} />
        <Paragraph typography="t6" color="#6b7280" textAlign="center">
          <Paragraph.Text>할 일을 만들려면 파트너와 연결이 필요해요</Paragraph.Text>
        </Paragraph>
        <Spacing size={24} />
        <Button
          size="large"
          display="block"
          color="primary"
          variant="fill"
          onClick={() => navigate('/onboarding/create')}
        >
          파트너 연결하러 가기
        </Button>
      </div>
    );
  }

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
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Button
          size="small"
          color="light"
          variant="weak"
          onClick={() => navigate('/home')}
        >
          &larr;
        </Button>
        <Paragraph typography="t4" fontWeight="bold" color="#111827">
          <Paragraph.Text>할 일 추가</Paragraph.Text>
        </Paragraph>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Title */}
        <TextField
          variant="box"
          label="할 일 이름"
          placeholder="예: 설거지, 빨래, 청소기 돌리기"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Spacing size={20} />

        {/* Assignee */}
        <Paragraph typography="t6" fontWeight="semibold" color="#374151">
          <Paragraph.Text>담당자</Paragraph.Text>
        </Paragraph>
        <Spacing size={8} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="large"
            display="full"
            color={effectiveAssigneeId === user.id ? 'primary' : 'light'}
            variant={effectiveAssigneeId === user.id ? 'fill' : 'weak'}
            onClick={() => setAssigneeId(user.id)}
            style={{ flex: 1 }}
          >
            나
          </Button>
          {partner && (
            <Button
              size="large"
              display="full"
              color={effectiveAssigneeId === partner.id ? 'primary' : 'light'}
              variant={effectiveAssigneeId === partner.id ? 'fill' : 'weak'}
              onClick={() => setAssigneeId(partner.id)}
              style={{ flex: 1 }}
            >
              {partner.nickname}
            </Button>
          )}
        </div>

        <Spacing size={20} />

        {/* Due Date */}
        <Paragraph typography="t6" fontWeight="semibold" color="#374151">
          <Paragraph.Text>마감일</Paragraph.Text>
        </Paragraph>
        <Spacing size={8} />
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

        {error && (
          <>
            <Spacing size={12} />
            <Paragraph typography="t7" color="#dc2626">
              <Paragraph.Text>{error}</Paragraph.Text>
            </Paragraph>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px' }}>
        <Button
          size="xlarge"
          display="full"
          color="primary"
          variant="fill"
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !dueDate}
          loading={loading}
        >
          {loading ? '추가 중...' : '등록하기'}
        </Button>
      </div>
    </div>
  );
}
