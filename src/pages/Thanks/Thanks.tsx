import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spacing, TextField, Button, Top, Text, ListRow, Checkbox } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
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
        <Text color={adaptive.grey500} typography="t5" textAlign="center">할 일 정보를 찾을 수 없어요</Text>
        <Spacing size={16} />
        <Button size="medium" color="primary" variant="fill" onClick={() => navigate('/home')}>홈으로</Button>
      </div>
    );
  }

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
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            감사 선물 보내기
          </Top.TitleParagraph>
        }
      />

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '16px 20px 0' }}>
        <div style={{ fontSize: '56px', lineHeight: 1 }}>🙏</div>
        <Spacing size={12} />
        <Text typography="t3" fontWeight="bold" color={adaptive.grey900} textAlign="center">
          {helperName}님이 대신 해줬어요!
        </Text>
        <Spacing size={4} />
        <Text typography="t6" color={adaptive.grey500} textAlign="center">
          {`'${chore.title}'을 해줬어요. 고마운 마음을 전해보세요`}
        </Text>
      </div>

      <Spacing size={28} />

      {/* 선물 선택 */}
      <div style={{ padding: '0 20px' }}>
        <Text typography="t5" fontWeight="bold" color={adaptive.grey900}>선물 고르기</Text>
        <Spacing size={12} />

        <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${adaptive.grey200}` }}>
          {REWARD_TEMPLATES.map((template) => {
            const isSelected = !useCustom && selectedKey === template.key;
            return (
              <ListRow
                key={template.key}
                onClick={() => { setSelectedKey(template.key); setUseCustom(false); }}
                withTouchEffect
                border="none"
                horizontalPadding="small"
                left={<span style={{ fontSize: '24px', flexShrink: 0 }}>{template.emoji}</span>}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={template.label}
                    topProps={{ color: isSelected ? adaptive.blue500 : adaptive.grey900, fontWeight: isSelected ? 'bold' : 'medium' }}
                    bottom=" "
                  />
                }
                right={
                  <Checkbox.Circle
                    inputType="radio"
                    checked={isSelected}
                    onCheckedChange={() => { setSelectedKey(template.key); setUseCustom(false); }}
                    size={22}
                  />
                }
                style={{
                  backgroundColor: isSelected ? adaptive.blue50 : '#fff',
                  borderBottom: `1px solid ${adaptive.grey100}`,
                }}
              />
            );
          })}

          {/* 직접 입력 */}
          <ListRow
            onClick={() => { setUseCustom(true); setSelectedKey(null); }}
            withTouchEffect
            border="none"
            horizontalPadding="small"
            left={<span style={{ fontSize: '24px', flexShrink: 0 }}>✍️</span>}
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top="직접 입력하기"
                topProps={{ color: useCustom ? adaptive.blue500 : adaptive.grey900, fontWeight: useCustom ? 'bold' : 'medium' }}
                bottom=" "
              />
            }
            right={
              <Checkbox.Circle
                inputType="radio"
                checked={useCustom}
                onCheckedChange={() => { setUseCustom(true); setSelectedKey(null); }}
                size={22}
              />
            }
            style={{
              backgroundColor: useCustom ? adaptive.blue50 : '#fff',
            }}
          />
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
            <Text typography="t7" color={adaptive.red500}>{error}</Text>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', backgroundColor: adaptive.background, borderTop: `1px solid ${adaptive.grey100}` }}>
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleSubmit} disabled={loading || !canSubmit} loading={loading}>
          마음 전하기
        </Button>
      </div>
    </div>
  );
}
