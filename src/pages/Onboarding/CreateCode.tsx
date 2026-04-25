import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spacing, Text, Button, Top, Badge, Asset } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useApp } from '../../context/AppContext';
import { useShare } from '../../hooks/useShare';
import { createInviteCode } from '../../data/couples';
import { supabase } from '../../data/supabase';
import type { Couple } from '../../types';

export default function CreateCode() {
  const { user, dispatch, partner } = useApp();
  const navigate = useNavigate();
  const { shareMessage } = useShare();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user?.couple_id && partner) {
      navigate('/home', { replace: true });
    }
  }, [user, partner, navigate]);

  useEffect(() => {
    if (!couple) return;
    pollingRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('couples')
        .select('*')
        .eq('id', couple.id)
        .single();
      if (data && data.user_b_id) {
        setCouple(data as Couple);
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (user) {
          dispatch({ type: 'SET_USER', payload: { ...user, couple_id: data.id } });
        }
        navigate('/home');
      }
    }, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [couple, user, dispatch, navigate]);

  const handleCreateCode = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createInviteCode(user.id);
      setCouple(result);
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            파트너를 초대하세요
          </Top.TitleParagraph>
        }
      />

      <div style={{ flex: 1, padding: '0 20px' }}>
        <Text typography="t6" color={adaptive.grey500}>
          초대코드를 만들어 파트너에게 공유해요
        </Text>

        <Spacing size={32} />

        {!couple ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '56px', lineHeight: 1 }}>💌</div>
            <Spacing size={16} />
            <Text typography="t5" color={adaptive.grey500} textAlign="center">
              초대코드를 만들어서 파트너에게 보내주세요
            </Text>
          </div>
        ) : (
          <>
            {/* 코드 카드 */}
            <div style={{
              backgroundColor: adaptive.grey50,
              borderRadius: '16px',
              padding: '28px 24px',
              textAlign: 'center',
            }}>
              <Text typography="t7" color={adaptive.grey500}>초대코드</Text>
              <Spacing size={12} />
              <Text
                typography="t1"
                fontWeight="bold"
                color={adaptive.grey900}
                textAlign="center"
                display="block"
              >
                <span style={{ letterSpacing: '8px', fontFamily: 'monospace' }}>
                  {couple.invite_code}
                </span>
              </Text>
              <Spacing size={16} />
              <Badge size="small" variant="fill" color="yellow">
                24시간 내에 입력해야 해요
              </Badge>
            </div>

            <Spacing size={20} />

            {/* 대기 상태 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px',
              backgroundColor: adaptive.blue50,
              borderRadius: '12px',
            }}>
              <Asset.Icon
                frameShape={Asset.frameShape.CleanW24}
                name="icon-time-mono"
                color={adaptive.blue500}
                aria-hidden
              />
              <Text typography="t6" color={adaptive.blue500} fontWeight="medium">
                파트너 연결을 기다리는 중...
              </Text>
            </div>

            <Spacing size={16} />

            <Button
              size="medium"
              display="full"
              color="light"
              variant="fill"
              onClick={() => navigate('/onboarding/enter')}
            >
              이미 코드가 있어요
            </Button>
          </>
        )}

        {error && (
          <>
            <Spacing size={12} />
            <Text typography="t7" color={adaptive.red500} textAlign="center">{error}</Text>
          </>
        )}
      </div>

      {!couple ? (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', backgroundColor: adaptive.background, borderTop: `1px solid ${adaptive.grey100}` }}>
          <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleCreateCode} disabled={loading} loading={loading}>
            초대코드 만들기
          </Button>
        </div>
      ) : (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', backgroundColor: adaptive.background, borderTop: `1px solid ${adaptive.grey100}` }}>
          <Button size="xlarge" display="full" color="primary" variant="fill" onClick={handleShare}>
            코드 공유하기
          </Button>
        </div>
      )}
    </div>
  );
}
