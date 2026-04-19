import { useCallback } from 'react';

interface UseShareResult {
  shareMessage: (message: string) => Promise<void>;
}

export function useShare(): UseShareResult {
  const shareMessage = useCallback(async (message: string): Promise<void> => {
    try {
      const { share } = await import('@apps-in-toss/web-framework');
      await share({ message });
    } catch {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(message);
    }
  }, []);

  return { shareMessage };
}
