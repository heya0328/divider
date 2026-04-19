import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { findOrCreateUser } from '../data/couples';

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { appLogin } = await import('@apps-in-toss/web-framework');
      const result = await appLogin();
      const dbUser = await findOrCreateUser(result.authorizationCode, '사용자');
      setUser(dbUser);
    } catch {
      // Non-Toss environment fallback
      try {
        const devTossUserId = 'dev-user-' + Date.now();
        const devNickname = '테스트 사용자';
        const dbUser = await findOrCreateUser(devTossUserId, devNickname);
        setUser(dbUser);
      } catch (devError) {
        setError(devError instanceof Error ? devError.message : '로그인 실패');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    login();
  }, [login]);

  return { user, loading, error };
}
