// 앱인토스 SDK 타입 mock — 로컬 개발용
// 실제 배포 시 @apps-in-toss/web-framework 패키지로 교체

declare module '@apps-in-toss/web-framework' {
  export function appLogin(): Promise<{
    authorizationCode: string;
    referrer: 'DEFAULT' | 'SANDBOX';
  }>;

  export function share(options: { message: string }): Promise<void>;

  export const graniteEvent: {
    addEventListener(
      eventName: 'backEvent',
      handlers: {
        onEvent: () => void;
        onError: (error: Error) => void;
      }
    ): () => void;
  };
}
