import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useBackEvent } from './hooks/useBackEvent';
import { AppProvider } from './context/AppContext';
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
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#FF6B6B' }}>{error || '로그인이 필요해요'}</p>
      </div>
    );
  }

  const initialRoute = user.couple_id ? '/home' : '/onboarding/create';

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
