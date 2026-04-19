import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        파트너 정보가 없어요
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '20px 16px 16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
          감사 선물 보내기
        </h1>
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Gratitude message */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🙏</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            파트너가 해줬어요!
          </h2>
          <p style={{ fontSize: '15px', color: '#6b7280' }}>
            {partner.nickname}님에게 감사의 선물을 보내세요
          </p>
        </div>

        {/* Template rewards */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            선물 고르기
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {REWARD_TEMPLATES.map((template) => (
              <button
                key={template.key}
                onClick={() => {
                  setSelectedKey(template.key);
                  setUseCustom(false);
                }}
                style={{
                  padding: '16px 12px',
                  borderRadius: '12px',
                  border: '2px solid',
                  borderColor:
                    !useCustom && selectedKey === template.key ? '#3b82f6' : '#e5e7eb',
                  backgroundColor:
                    !useCustom && selectedKey === template.key ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '28px' }}>{template.emoji}</span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color:
                      !useCustom && selectedKey === template.key ? '#3b82f6' : '#374151',
                  }}
                >
                  {template.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => {
              setUseCustom(true);
              setSelectedKey(null);
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '2px solid',
              borderColor: useCustom ? '#3b82f6' : '#e5e7eb',
              backgroundColor: useCustom ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              fontWeight: 600,
              color: useCustom ? '#3b82f6' : '#374151',
              marginBottom: '8px',
            }}
          >
            직접 입력하기 ✏️
          </button>
          {useCustom && (
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="어떤 선물을 보낼까요?"
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
          )}
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            cursor: loading || !canSubmit ? 'not-allowed' : 'pointer',
            opacity: loading || !canSubmit ? 0.5 : 1,
          }}
        >
          {loading ? '전송 중...' : '마음 전하기'}
        </button>
      </div>
    </div>
  );
}
