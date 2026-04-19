import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { joinWithCode } from '../../data/couples';

export default function EnterCode() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user || code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await joinWithCode(user.id, code);
      navigate('/home');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('expired')) {
          setError('코드가 만료되었어요. 파트너에게 새 코드를 요청해주세요.');
        } else {
          setError('코드가 올바르지 않아요. 다시 확인해주세요.');
        }
      } else {
        setError('오류가 발생했어요. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
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
          초대코드 입력
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '32px' }}>
          파트너에게 받은 6자리 코드를 입력해요
        </p>

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="XXXXXX"
          maxLength={6}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: error ? '2px solid #dc2626' : '2px solid #e5e7eb',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '8px',
            textAlign: 'center',
            fontFamily: 'monospace',
            backgroundColor: '#ffffff',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '8px' }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || code.length !== 6}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
            opacity: loading || code.length !== 6 ? 0.5 : 1,
            marginTop: '16px',
          }}
        >
          {loading ? '확인 중...' : '입력하기'}
        </button>
      </div>
    </div>
  );
}
