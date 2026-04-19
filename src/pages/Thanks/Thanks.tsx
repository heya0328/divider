import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paragraph, Spacing, TextField, Button } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import { createReward } from '../../data/rewards';
import { REWARD_TEMPLATES } from '../../constants';

export default function Thanks() {
  const { id: choreId } = useParams<{ id: string }>();
  const { user, partner, chores, dispatch } = useApp();
  const navigate = useNavigate();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chore = chores.find((c) => c.id === choreId);

  if (!user || !choreId || !chore) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Paragraph typography="t5" color="#6b7280" textAlign="center">
          <Paragraph.Text>할 일 정보를 찾을 수 없어요</Paragraph.Text>
        </Paragraph>
        <Spacing size={16} />
        <Button size="medium" color="primary" variant="fill" onClick={() => navigate('/home')}>
          홈으로
        </Button>
      </div>
    );
  }

  // 실제로 대신 해준 사람 (completed_by_id)
  const helperId = chore.completed_by_id;
  const helperName = helperId === partner?.id ? partner.nickname : '파트너';

  const canSubmit = useCustom ? customText.trim().length > 0 : selectedKey !== null;

  const handleSubmit = async () => {
    if (!canSubmit || !helperId) return;
    setLoading(true);
    setError(null);
    try {
      const reward = await createReward({
        chore_id: choreId,
        giver_id: user.id,
        receiver_id: helperId,
        type: useCustom ? 'custom' : 'template',
        template_key: useCustom ? undefined : (selectedKey ?? undefined),
        custom_text: useCustom ? customText.trim() : undefined,
      });
      dispatch({ type: 'ADD_REWARD', payload: reward });
      navigate('/home');
    } catch {
      setError('마음을 전하지 못했어요. 다시 시도해주세요.');
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
          <Paragraph.Text>감사 선물 보내기</Paragraph.Text>
        </Paragraph>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Gratitude hero */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '56px', lineHeight: 1 }}>🙏</div>
          <Spacing size={12} />
          <Paragraph typography="t3" fontWeight="bold" color="#111827" textAlign="center">
            <Paragraph.Text>{helperName}님이 대신 해줬어요!</Paragraph.Text>
          </Paragraph>
          <Spacing size={4} />
          <Paragraph typography="t6" color="#6b7280" textAlign="center">
            <Paragraph.Text>'{chore.title}'을 해줬어요. 고마운 마음을 전해보세요</Paragraph.Text>
          </Paragraph>
        </div>

        <Spacing size={32} />

        {/* Reward selection */}
        <Paragraph typography="t6" fontWeight="semibold" color="#374151">
          <Paragraph.Text>선물 고르기</Paragraph.Text>
        </Paragraph>
        <Spacing size={8} />

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
          {REWARD_TEMPLATES.map((template) => {
            const isSelected = !useCustom && selectedKey === template.key;
            return (
              <div
                key={template.key}
                onClick={() => { setSelectedKey(template.key); setUseCustom(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#eff6ff' : '#fff',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{template.emoji}</span>
                <Paragraph typography="t6" fontWeight={isSelected ? 'semibold' : 'medium'} color={isSelected ? '#3182f6' : '#111827'}>
                  <Paragraph.Text>{template.label}</Paragraph.Text>
                </Paragraph>
                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '10px',
                    border: `2px solid ${isSelected ? '#3182f6' : '#d1d5db'}`,
                    backgroundColor: isSelected ? '#3182f6' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: '11px' }}>✓</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Custom option */}
          <div
            onClick={() => { setUseCustom(true); setSelectedKey(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              backgroundColor: useCustom ? '#eff6ff' : '#fff',
            }}
          >
            <span style={{ fontSize: '24px', flexShrink: 0 }}>✍️</span>
            <Paragraph typography="t6" fontWeight={useCustom ? 'semibold' : 'medium'} color={useCustom ? '#3182f6' : '#111827'}>
              <Paragraph.Text>직접 입력하기</Paragraph.Text>
            </Paragraph>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '10px',
                border: `2px solid ${useCustom ? '#3182f6' : '#d1d5db'}`,
                backgroundColor: useCustom ? '#3182f6' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {useCustom && <span style={{ color: '#fff', fontSize: '11px' }}>✓</span>}
              </div>
            </div>
          </div>
        </div>

        {useCustom && (
          <>
            <Spacing size={12} />
            <TextField
              variant="box"
              label="직접 입력"
              placeholder="예: 주말에 영화 보러 가기"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
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

      {/* Bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', backgroundColor: '#fff' }}>
        <Button
          size="xlarge"
          display="full"
          color="primary"
          variant="fill"
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          loading={loading}
        >
          마음 전하기
        </Button>
      </div>
    </div>
  );
}
