import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, TextField, Button } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import { createChore } from '../../data/chores';
import RewardPicker from '../../components/RewardPicker';

export default function ChoreCreate() {
  const { user, partner, dispatch } = useApp();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>(user?.id ?? '');
  const [dueDate, setDueDate] = useState('');
  const [proposedReward, setProposedReward] = useState<{ type: 'template' | 'custom'; key?: string; text?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

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
        <Button size="large" color="primary" variant="fill" onClick={() => navigate('/onboarding/create')}>
          파트너 연결하러 가기
        </Button>
      </div>
    );
  }

  const isPartnerAssigned = partner != null && assigneeId === partner.id;

  const handleSubmit = async () => {
    if (!title.trim() || !user.couple_id) return;
    setLoading(true);
    setError(null);
    try {
      const chore = await createChore({
        couple_id: user.couple_id,
        title: title.trim(),
        created_by_id: user.id,
        assignee_id: assigneeId,
        due_date: dueDate || undefined,
        proposed_reward_type: proposedReward?.type,
        proposed_reward_key: proposedReward?.key,
        proposed_reward_text: proposedReward?.text,
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
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button size="small" color="light" variant="weak" onClick={() => navigate('/home')}>
          ←
        </Button>
        <Paragraph typography="t4" fontWeight="bold" color="#111827">
          <Paragraph.Text>할 일 추가</Paragraph.Text>
        </Paragraph>
      </div>

      <div style={{ padding: '24px 16px' }}>
        <TextField
          variant="box"
          label="할 일 이름"
          placeholder="예: 설거지, 빨래, 청소기 돌리기"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Spacing size={24} />

        {/* Assignee Selection */}
        <Paragraph typography="t6" fontWeight="semibold" color="#374151">
          <Paragraph.Text>누가 할까요?</Paragraph.Text>
        </Paragraph>
        <Spacing size={8} />

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          {[
            { id: user.id, name: '나', desc: '내가 직접 할게요' },
            ...(partner ? [{ id: partner.id, name: partner.nickname, desc: '파트너에게 요청해요' }] : []),
          ].map((option) => {
            const selected = assigneeId === option.id;
            return (
              <div
                key={option.id}
                onClick={() => { setAssigneeId(option.id); if (option.id === user.id) setProposedReward(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', cursor: 'pointer',
                  backgroundColor: selected ? '#eff6ff' : '#fff', borderBottom: '1px solid #f3f4f6',
                }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '11px',
                  border: `2px solid ${selected ? '#3182f6' : '#d1d5db'}`,
                  backgroundColor: selected ? '#3182f6' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {selected && <span style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}>✓</span>}
                </div>
                <div>
                  <Paragraph typography="t6" fontWeight="semibold" color={selected ? '#3182f6' : '#111827'}>
                    <Paragraph.Text>{option.name}</Paragraph.Text>
                  </Paragraph>
                  <Paragraph typography="t7" color="#9ca3af">
                    <Paragraph.Text>{option.desc}</Paragraph.Text>
                  </Paragraph>
                </div>
              </div>
            );
          })}
        </div>

        {/* 파트너에게 할당 시 보상 설정 */}
        {isPartnerAssigned && (
          <>
            <Spacing size={24} />
            <Paragraph typography="t6" fontWeight="semibold" color="#374151">
              <Paragraph.Text>해주면 이렇게 보답할게요</Paragraph.Text>
            </Paragraph>
            <Spacing size={4} />
            <Paragraph typography="t7" color="#9ca3af">
              <Paragraph.Text>보상을 설정하면 파트너가 더 기꺼이 수락해요</Paragraph.Text>
            </Paragraph>
            <Spacing size={8} />
            <RewardPicker onSelect={setProposedReward} />
          </>
        )}

        <Spacing size={24} />

        {/* Due Date (optional) */}
        <Paragraph typography="t6" fontWeight="semibold" color="#374151">
          <Paragraph.Text>마감일 (선택)</Paragraph.Text>
        </Paragraph>
        <Spacing size={8} />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            border: '1.5px solid #e5e7eb', fontSize: '15px', outline: 'none',
            boxSizing: 'border-box', backgroundColor: '#ffffff',
            color: dueDate ? '#111827' : '#9ca3af',
          }}
        />
        {dueDate && (
          <>
            <Spacing size={4} />
            <Button size="small" color="light" variant="weak" onClick={() => setDueDate('')}>
              마감일 삭제
            </Button>
          </>
        )}

        {error && (
          <>
            <Spacing size={12} />
            <Paragraph typography="t7" color="#dc2626">
              <Paragraph.Text>{error}</Paragraph.Text>
            </Paragraph>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', backgroundColor: '#fff' }}>
        <Button size="xlarge" display="full" color="primary" variant="fill"
          onClick={handleSubmit} disabled={loading || !title.trim()} loading={loading}>
          등록하기
        </Button>
      </div>
    </div>
  );
}
