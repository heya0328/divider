import { useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, Button } from '@toss/tds-mobile';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', lineHeight: 1 }}>🏠</div>
        <Spacing size={16} />
        <Paragraph typography="t2" fontWeight="bold" color="#111827" textAlign="center">
          <Paragraph.Text>Divider</Paragraph.Text>
        </Paragraph>
        <Spacing size={8} />
        <Paragraph typography="t6" color="#6b7280" textAlign="center">
          <Paragraph.Text>집안일을 함께 나누고,{'\n'}서로의 도움에 감사를 전해요</Paragraph.Text>
        </Paragraph>

        <Spacing size={48} />

        <Button
          size="xlarge"
          display="full"
          color="primary"
          variant="fill"
          onClick={() => navigate('/onboarding/create')}
        >
          초대코드 만들기
        </Button>

        <Spacing size={12} />

        <Button
          size="xlarge"
          display="full"
          color="light"
          variant="fill"
          onClick={() => navigate('/onboarding/enter')}
        >
          초대코드 입력하기
        </Button>

        <Spacing size={32} />

        <Button
          size="small"
          display="full"
          color="light"
          variant="weak"
          onClick={() => {
            localStorage.removeItem('divider_dev_user_id');
            window.location.href = '/';
          }}
        >
          다른 사용자로 시작하기
        </Button>
      </div>
    </div>
  );
}
