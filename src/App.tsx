import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useAuth } from './hooks/useAuth';
import { useBackEvent } from './hooks/useBackEvent';
import { AppProvider } from './context/AppContext';
import Welcome from './pages/Onboarding/Welcome';
import CreateCode from './pages/Onboarding/CreateCode';
import EnterCode from './pages/Onboarding/EnterCode';
import Home from './pages/Home/Home';
import ChoreCreate from './pages/ChoreCreate/ChoreCreate';
import ChoreDetail from './pages/ChoreDetail/ChoreDetail';
import { HelpRequest } from './pages/HelpRequest/HelpRequest';
import Thanks from './pages/Thanks/Thanks';
import Rewards from './pages/Rewards/Rewards';

function AppRoutes() {
  useBackEvent();
  return (
    <Routes>
      <Route path="/onboarding" element={<Welcome />} />
      <Route path="/onboarding/create" element={<CreateCode />} />
      <Route path="/onboarding/enter" element={<EnterCode />} />
      <Route path="/home" element={<Home />} />
      <Route path="/chore/create" element={<ChoreCreate />} />
      <Route path="/chore/:id" element={<ChoreDetail />} />
      <Route path="/help-request/:id" element={<HelpRequest />} />
      <Route path="/thanks/:id" element={<Thanks />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user, loading, error, retry } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Paragraph typography="t5" color="#6b7280" textAlign="center">
          <Paragraph.Text>로딩 중...</Paragraph.Text>
        </Paragraph>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '24px' }}>
        <Paragraph typography="t5" color="#dc2626" textAlign="center">
          <Paragraph.Text>{error || '로그인이 필요해요'}</Paragraph.Text>
        </Paragraph>
        <Spacing size={16} />
        <Button size="large" color="primary" variant="fill" onClick={retry}>
          다시 시도
        </Button>
        <Spacing size={8} />
        <Button size="medium" color="light" variant="weak" onClick={() => {
          localStorage.removeItem('divider_dev_user_id');
          window.location.reload();
        }}>
          새 사용자로 시작
        </Button>
      </div>
    );
  }

  const initialRoute = user.couple_id ? '/home' : '/onboarding';

  return (
    <AppProvider user={user}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={initialRoute} replace />} />
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
