import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spacing, Top, TextField, Text, Button } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useApp } from '../../context/AppContext';
import { joinWithCode } from '../../data/couples';

export default function EnterCode() {
  const { user, dispatch, refreshData, partner } = useApp();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      dispatch({
        type: 'SET_USER',
        payload: { ...user, couple_id: updatedCouple.id },
      });
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            초대코드 입력
          </Top.TitleParagraph>
        }
      />

      <div style={{ flex: 1, padding: '0 20px' }}>
        <Text typography="t6" color={adaptive.grey500}>
          파트너에게 받은 6자리 코드를 입력해요
        </Text>

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

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', backgroundColor: adaptive.background, borderTop: `1px solid ${adaptive.grey100}` }}>
        <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleSubmit} disabled={loading || code.length !== 6} loading={loading}>
          파트너와 연결하기
        </Button>
      </div>
    </div>
  );
}
