import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useApp } from '../../context/AppContext';
import { useShare } from '../../hooks/useShare';
import { createInviteCode } from '../../data/couples';
import { supabase } from '../../data/supabase';
import type { Couple } from '../../types';

export default function CreateCode() {
  const { user, dispatch } = useApp();
  const navigate = useNavigate();
  const { shareMessage } = useShare();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 파트너가 코드를 입력했는지 폴링
  useEffect(() => {
    if (!couple) return;

    pollingRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('couples')
        .select('*')
        .eq('id', couple.id)
        .single();

      if (data && data.user_b_id) {
        // 파트너가 연결됨!
        setCouple(data as Couple);
        if (pollingRef.current) clearInterval(pollingRef.current);

        // user 상태 업데이트
        if (user) {
          dispatch({ type: 'SET_USER', payload: { ...user, couple_id: data.id } });
        }

        navigate('/home');
      }
    }, 3000); // 3초마다 확인

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [couple, user, dispatch, navigate]);

  const handleCreateCode = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createInviteCode(user.id);
      setCouple(result);
      // user 상태에 couple_id 반영
      dispatch({ type: 'SET_USER', payload: { ...user, couple_id: result.id } });
    } catch {
      setError('코드 생성에 실패했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!couple) return;
    const message = `Divider에서 함께 집안일을 나눠요!\n초대코드: ${couple.invite_code}\n토스 앱에서 Divider를 검색하고 이 코드를 입력해주세요.`;
    await shareMessage(message);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <Paragraph typography="t3" fontWeight="bold" color="#111827" textAlign="center">
          <Paragraph.Text>파트너를 초대하세요</Paragraph.Text>
        </Paragraph>
        <Spacing size={8} />
        <Paragraph typography="t6" color="#6b7280" textAlign="center">
          <Paragraph.Text>초대코드를 만들어 파트너에게 공유해요</Paragraph.Text>
        </Paragraph>
        <Spacing size={32} />

        {!couple ? (
          <Button
            size="xlarge"
            display="full"
            color="primary"
            variant="fill"
            onClick={handleCreateCode}
            disabled={loading}
            loading={loading}
          >
            초대코드 만들기
          </Button>
        ) : (
          <>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px' }}>
              <Paragraph typography="t7" color="#9ca3af" textAlign="center">
                <Paragraph.Text>초대코드</Paragraph.Text>
              </Paragraph>
              <Spacing size={8} />
              <Paragraph typography="t1" fontWeight="bold" color="#111827" textAlign="center">
                <Paragraph.Text style={{ letterSpacing: '6px', fontFamily: 'monospace' }}>
                  {couple.invite_code}
                </Paragraph.Text>
              </Paragraph>
            </div>
            <Spacing size={16} />
            <Paragraph typography="t7" color="#6b7280" textAlign="center">
              <Paragraph.Text>파트너가 이 코드를 입력하면 자동으로 연결돼요</Paragraph.Text>
            </Paragraph>
            <Spacing size={4} />
            <Paragraph typography="t7" color="#f59e0b" textAlign="center">
              <Paragraph.Text>24시간 내에 입력해야 해요</Paragraph.Text>
            </Paragraph>
            <Spacing size={16} />
            <Button
              size="xlarge"
              display="full"
              color="primary"
              variant="fill"
              onClick={handleShare}
            >
              코드 공유하기
            </Button>
            <Spacing size={12} />
            <Paragraph typography="t7" color="#3b82f6" textAlign="center">
              <Paragraph.Text>파트너 연결을 기다리는 중...</Paragraph.Text>
            </Paragraph>
          </>
        )}

        {error && (
          <>
            <Spacing size={12} />
            <Paragraph typography="t7" color="#dc2626" textAlign="center">
              <Paragraph.Text>{error}</Paragraph.Text>
            </Paragraph>
          </>
        )}

        <Spacing size={16} />
        <Button
          size="large"
          display="full"
          color="light"
          variant="fill"
          onClick={() => navigate('/onboarding/enter')}
        >
          이미 코드가 있어요
        </Button>
      </div>
    </div>
  );
}
