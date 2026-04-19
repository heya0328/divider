import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paragraph, Spacing, TextField, Button, ListRow } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import { createReward } from '../../data/rewards';
import { REWARD_TEMPLATES } from '../../constants';

export default function Thanks() {
  const { id: choreId } = useParams<{ id: string }>();
  const { user, partner, dispatch } = useApp();
  const navigate = useNavigate();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !partner || !choreId) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Paragraph typography="t5" color="#6b7280" textAlign="center">
          <Paragraph.Text>파트너 정보가 없어요</Paragraph.Text>
        </Paragraph>
      </div>
    );
  }

  const canSubmit = useCustom ? customText.trim().length > 0 : selectedKey !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const reward = await createReward({
        chore_id: choreId,
        giver_id: user.id,
        receiver_id: partner.id,
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
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <Paragraph typography="t4" fontWeight="bold" color="#111827">
          <Paragraph.Text>감사 선물 보내기</Paragraph.Text>
        </Paragraph>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Gratitude message */}
        <div style={{ textAlign: 'center' }}>
          <Paragraph typography="t1" textAlign="center">
            <Paragraph.Text style={{ fontSize: '64px' }}>&#x1F64F;</Paragraph.Text>
          </Paragraph>
          <Spacing size={12} />
          <Paragraph typography="t3" fontWeight="bold" color="#111827" textAlign="center">
            <Paragraph.Text>파트너가 해줬어요!</Paragraph.Text>
          </Paragraph>
          <Spacing size={8} />
          <Paragraph typography="t6" color="#6b7280" textAlign="center">
            <Paragraph.Text>{partner.nickname}님에게 감사의 선물을 보내세요</Paragraph.Text>
          </Paragraph>
        </div>

        <Spacing size={32} />

        {/* Template rewards */}
        <Paragraph typography="t6" fontWeight="semibold" color="#374151">
          <Paragraph.Text>선물 고르기</Paragraph.Text>
        </Paragraph>
        <Spacing size={12} />

        {REWARD_TEMPLATES.map((template) => {
          const isSelected = !useCustom && selectedKey === template.key;
          return (
            <ListRow
              key={template.key}
              onClick={() => {
                setSelectedKey(template.key);
                setUseCustom(false);
              }}
              left={<span style={{ fontSize: 28 }}>{template.emoji}</span>}
              contents={
                <ListRow.Texts
                  type="1RowTypeA"
                  top={template.label}
                />
              }
              right={
                isSelected ? (
                  <Paragraph typography="t7" color="#3b82f6" fontWeight="bold">
                    <Paragraph.Text>&#x2713;</Paragraph.Text>
                  </Paragraph>
                ) : undefined
              }
              border="indented"
            />
          );
        })}

        <Spacing size={16} />

        {/* Custom input */}
        <Button
          size="large"
          display="full"
          color={useCustom ? 'primary' : 'light'}
          variant={useCustom ? 'fill' : 'weak'}
          onClick={() => {
            setUseCustom(true);
            setSelectedKey(null);
          }}
        >
          직접 입력하기
        </Button>

        {useCustom && (
          <>
            <Spacing size={8} />
            <TextField
              variant="box"
              label="직접 입력"
              placeholder="어떤 선물을 보낼까요?"
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

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px' }}>
        <Button
          size="xlarge"
          display="full"
          color="primary"
          variant="fill"
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          loading={loading}
        >
          {loading ? '전송 중...' : '마음 전하기'}
        </Button>
      </div>
    </div>
  );
}
