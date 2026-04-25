import { useNavigate } from 'react-router-dom';
import { Spacing, Text, Button, FixedBottomCTA } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ fontSize: '64px', lineHeight: 1 }}>🏠</div>
        <Spacing size={20} />
        <Text typography="t1" fontWeight="bold" color={adaptive.grey900} textAlign="center">
          Divider
        </Text>
        <Spacing size={8} />
        <Text typography="t6" color={adaptive.grey500} textAlign="center">
          {'집안일을 함께 나누고,\n서로의 도움에 감사를 전해요'}
        </Text>
      </div>

      <div style={{ padding: '0 20px 24px' }}>
        <Button
          size="xlarge"
          display="full"
          color="primary"
          variant="fill"
          onClick={() => navigate('/onboarding/create')}
        >
          초대코드 만들기
        </Button>
        <Spacing size={10} />
        <Button
          size="xlarge"
          display="full"
          color="light"
          variant="fill"
          onClick={() => navigate('/onboarding/enter')}
        >
          초대코드 입력하기
        </Button>
      </div>
    </div>
  );
}
