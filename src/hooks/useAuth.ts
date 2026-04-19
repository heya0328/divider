import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { findOrCreateUser } from '../data/couples';
import { supabase } from '../data/supabase';

const DEV_USER_KEY = 'divider_dev_user_id';

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * 토스 앱 내부인지 감지.
 * apps-in-toss SDK는 네이티브 브릿지(window.__ait__)를 통해 동작하므로,
 * 이 브릿지가 없으면 일반 브라우저(로컬 개발 환경)로 판단.
 */
function isInTossApp(): boolean {
  try {
    return !!(
      (window as any).__ait__ ||
      (window as any).__APPS_IN_TOSS__ ||
      (window as any).AppsInToss ||
      navigator.userAgent.includes('TossApp')
    );
  } catch {
    return false;
  }
}

async function loginWithDevFallback(): Promise<User> {
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
    return existing as User;
  }

  return findOrCreateUser(devTossUserId, '테스트 사용자');
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isInTossApp()) {
        // 토스 앱 내부: SDK 로그인
        const { appLogin } = await import('@apps-in-toss/web-framework');
        const result = await appLogin();
        const dbUser = await findOrCreateUser(result.authorizationCode, '사용자');
        setUser(dbUser);
      } else {
        // 로컬 개발 환경: dev fallback
        const dbUser = await loginWithDevFallback();
        setUser(dbUser);
      }
    } catch (err) {
      console.error('Auth failed:', err);
      setError(err instanceof Error ? err.message : '로그인에 실패했어요');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    login();
  }, [login]);

  return { user, loading, error, retry: login };
}
