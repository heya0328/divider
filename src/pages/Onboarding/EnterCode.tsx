import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, TextField, Button } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import { joinWithCode } from '../../data/couples';

export default function EnterCode() {
  const { user, dispatch, refreshData, partner } = useApp();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 매칭 완료된 사용자는 홈으로
  useEffect(() => {
    if (user?.couple_id && partner) {
      navigate('/home', { replace: true });
    }
  }, [user, partner, navigate]);

  const handleSubmit = async () => {
    if (!user || code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const updatedCouple = await joinWithCode(user.id, code);
      // Update user with the new couple_id so the app knows we're matched
      dispatch({
        type: 'SET_USER',
        payload: { ...user, couple_id: updatedCouple.id },
      });
      // 매칭 후 데이터 로드
      await refreshData();
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '100px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
        <Paragraph typography="t3" fontWeight="bold" color="#111827" textAlign="center">
          <Paragraph.Text>초대코드 입력</Paragraph.Text>
        </Paragraph>
        <Spacing size={8} />
        <Paragraph typography="t6" color="#6b7280" textAlign="center">
          <Paragraph.Text>파트너에게 받은 6자리 코드를 입력해요</Paragraph.Text>
        </Paragraph>
        <Spacing size={32} />

        <TextField
          variant="box"
          label="초대코드"
          placeholder="XXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          hasError={!!error}
          help={error ?? undefined}
        />
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px' }}>
        <Button
          size="xlarge"
          display="full"
          color="primary"
          variant="fill"
          onClick={handleSubmit}
          disabled={loading || code.length !== 6}
          loading={loading}
        >
          {loading ? '확인 중...' : '파트너와 연결하기'}
        </Button>
      </div>
    </div>
  );
}
