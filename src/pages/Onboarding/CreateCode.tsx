import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useShare } from '../../hooks/useShare';
import { createInviteCode } from '../../data/couples';
import type { Couple } from '../../types';

export default function CreateCode() {
  const { user } = useApp();
  const { shareMessage } = useShare();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCode = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createInviteCode(user.id);
      setCouple(result);
    } catch {
      setError('코드 생성에 실패했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!couple) return;
    const message = `Divider 초대코드: ${couple.invite_code}\n24시간 내에 입력해야 해요!`;
    await shareMessage(message);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          파트너를 초대하세요
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '32px' }}>
          초대코드를 만들어 파트너에게 공유해요
        </p>

        {!couple ? (
          <button
            onClick={handleCreateCode}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '생성 중...' : '초대코드 만들기'}
          </button>
        ) : (
          <div>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '32px',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>초대코드</p>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  color: '#111827',
                  letterSpacing: '6px',
                  fontFamily: 'monospace',
                }}
              >
                {couple.invite_code}
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#f59e0b', marginBottom: '16px' }}>
              ⏰ 24시간 내에 입력해야 해요
            </p>
            <button
              onClick={handleShare}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              코드 공유하기
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '12px' }}>{error}</p>
        )}
      </div>
    </div>
  );
}
