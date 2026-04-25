import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spacing, TextField, Button, Checkbox, ListRow, Top, Text, ListHeader } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useApp } from '../../context/AppContext';
import { createChore } from '../../data/chores';
import RewardPicker from '../../components/RewardPicker';
import RecurrencePicker, { type RecurrenceValue } from '../../components/RecurrencePicker';
import { createChoreTemplate } from '../../data/choreTemplates';

export default function ChoreCreate() {
  const { user, partner, dispatch } = useApp();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>(user?.id ?? '');
  const [dueDate, setDueDate] = useState('');
  const [proposedReward, setProposedReward] = useState<{ type: 'template' | 'custom'; key?: string; text?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceValue | null>(null);

  if (!user) return null;

  if (!user.couple_id) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Text typography="t4" fontWeight="bold" color={adaptive.grey900} textAlign="center">
          파트너와 먼저 연결해주세요
        </Text>
        <Spacing size={8} />
        <Text typography="t6" color={adaptive.grey500} textAlign="center">
          할 일을 만들려면 파트너와 연결이 필요해요
        </Text>
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
      if (recurrence) {
        await createChoreTemplate({
          couple_id: user.couple_id,
          title: title.trim(),
          created_by_id: user.id,
          assignee_id: assigneeId,
          recurrence_type: recurrence.type,
          recurrence_days: recurrence.days,
          monthly_nth: recurrence.monthlyNth,
          monthly_weekday: recurrence.monthlyWeekday,
          proposed_reward_type: proposedReward?.type,
          proposed_reward_key: proposedReward?.key,
          proposed_reward_text: proposedReward?.text,
        });
      } else {
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
      }
      navigate('/home');
    } catch {
      setError('할 일을 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const assigneeOptions = [
    { id: user.id, name: '나', desc: '내가 직접 할게요' },
    ...(partner ? [{ id: partner.id, name: partner.nickname, desc: '파트너에게 요청해요' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            할 일 추가
          </Top.TitleParagraph>
        }
      />

      <div style={{ padding: '0 20px' }}>
        <TextField
          variant="box"
          label="할 일 이름"
          placeholder="예: 설거지, 빨래, 청소기 돌리기"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <Spacing size={8} />

      {/* 담당자 선택 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            누가 할까요?
          </ListHeader.TitleParagraph>
        }
      />
      <div style={{ margin: '0 20px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${adaptive.grey200}` }}>
        {assigneeOptions.map((option) => {
          const selected = assigneeId === option.id;
          return (
            <ListRow
              key={option.id}
              onClick={() => { setAssigneeId(option.id); if (option.id === user.id) setProposedReward(null); }}
              withTouchEffect
              border="none"
              horizontalPadding="small"
              left={
                <Checkbox.Circle
                  inputType="radio"
                  checked={selected}
                  onCheckedChange={() => { setAssigneeId(option.id); if (option.id === user.id) setProposedReward(null); }}
                  size={22}
                />
              }
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={option.name}
                  topProps={{ color: selected ? adaptive.blue500 : adaptive.grey900, fontWeight: 'bold' }}
                  bottom={option.desc}
                  bottomProps={{ color: adaptive.grey400 }}
                />
              }
              style={{
                backgroundColor: selected ? adaptive.blue50 : '#fff',
                borderBottom: `1px solid ${adaptive.grey100}`,
              }}
            />
          );
        })}
      </div>

      {/* 파트너에게 할당 시 보상 설정 */}
      {isPartnerAssigned && (
        <>
          <Spacing size={8} />
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
                해주면 이렇게 보답할게요
              </ListHeader.TitleParagraph>
            }
            description={
              <ListHeader.DescriptionParagraph>
                보상을 설정하면 파트너가 더 기꺼이 수락해요
              </ListHeader.DescriptionParagraph>
            }
            descriptionPosition="bottom"
          />
          <div style={{ padding: '0 20px' }}>
            <RewardPicker onSelect={setProposedReward} />
          </div>
        </>
      )}

      <Spacing size={8} />

      {/* 반복 설정 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            반복 설정
          </ListHeader.TitleParagraph>
        }
        description={
          <ListHeader.DescriptionParagraph>선택사항</ListHeader.DescriptionParagraph>
        }
        descriptionPosition="bottom"
      />
      <RecurrencePicker value={recurrence} onChange={setRecurrence} />

      {!recurrence && (
        <>
          <Spacing size={8} />
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
                마감일
              </ListHeader.TitleParagraph>
            }
            description={
              <ListHeader.DescriptionParagraph>선택사항</ListHeader.DescriptionParagraph>
            }
            descriptionPosition="bottom"
          />
          <div style={{ padding: '0 20px' }}>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                border: `1.5px solid ${adaptive.grey200}`, fontSize: '15px', outline: 'none',
                boxSizing: 'border-box', backgroundColor: '#fff',
                color: dueDate ? adaptive.grey900 : adaptive.grey400,
              }}
            />
            {dueDate && (
              <>
                <Spacing size={8} />
                <Button size="small" color="light" variant="fill" onClick={() => setDueDate('')}>
                  마감일 삭제
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {error && (
        <div style={{ padding: '12px 20px' }}>
          <Text typography="t7" color={adaptive.red500}>{error}</Text>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', backgroundColor: adaptive.background, borderTop: `1px solid ${adaptive.grey100}` }}>
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleSubmit} disabled={loading || !title.trim() || (recurrence?.type === 'weekly' && recurrence.days.length === 0)} loading={loading}>
          {recurrence ? '반복 등록하기' : '등록하기'}
        </Button>
      </div>
    </div>
  );
}
