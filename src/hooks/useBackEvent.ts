import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BACK_MAP } from '../constants';

function matchPath(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every(
    (part, i) => part.startsWith(':') || part === pathParts[i]
  );
}

function resolveTarget(currentPath: string): string | null | undefined {
  for (const [pattern, target] of Object.entries(BACK_MAP)) {
    if (matchPath(pattern, currentPath)) {
      return target;
    }
  }
  return undefined; // no match found
}

export function useBackEvent(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        const { graniteEvent } = await import('@apps-in-toss/web-framework');
        unsubscribe = graniteEvent.addEventListener('backEvent', {
          onEvent: () => {
            const currentPath = locationRef.current.pathname;
            const target = resolveTarget(currentPath);
            if (target === undefined) {
              // Path not in BACK_MAP — do nothing
              return;
            }
            if (target === null) {
              // null means show exit confirm dialog
              if (window.confirm('앱을 종료하시겠습니까?')) {
                // In Toss app, closing is handled by OS back — nothing to do here
              }
            } else {
              navigate(target);
            }
          },
          onError: (err: Error) => {
            console.error('[useBackEvent] graniteEvent error:', err);
          },
        });
      } catch {
        // Non-Toss environment: no back event support, silent fallback
      }
    };

    setup();

    return () => {
      unsubscribe?.();
    };
  }, [navigate]);
}
