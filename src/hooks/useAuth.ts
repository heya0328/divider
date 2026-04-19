import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { findOrCreateUser } from '../data/couples';
import { supabase } from '../data/supabase';

const DEV_USER_KEY = 'divider_dev_user_id';

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
      // 비토스 환경 폴백: localStorage에 사용자 ID를 영속화하여
      // 새로고침해도 같은 사용자로 로그인
      try {
        let devTossUserId = localStorage.getItem(DEV_USER_KEY);
        if (!devTossUserId) {
          devTossUserId = 'dev-user-' + Date.now();
          localStorage.setItem(DEV_USER_KEY, devTossUserId);
        }

        // DB에서 최신 사용자 정보 조회 (couple_id 등 반영)
        const { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('toss_user_id', devTossUserId)
          .maybeSingle();

        if (existing) {
          setUser(existing as User);
        } else {
          const dbUser = await findOrCreateUser(devTossUserId, '테스트 사용자');
          setUser(dbUser);
        }
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
