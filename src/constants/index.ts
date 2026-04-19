import type { RewardTemplate } from '../types';

export const REWARD_TEMPLATES: RewardTemplate[] = [
  { key: 'coffee', label: '커피 한 잔', emoji: '☕' },
  { key: 'dessert', label: '디저트', emoji: '🍰' },
  { key: 'massage', label: '안마 10분', emoji: '💆' },
  { key: 'menu_choice', label: '오늘 메뉴 선택권', emoji: '🍽️' },
  { key: 'rest', label: '1시간 휴식권', emoji: '😴' },
];

export const INVITE_CODE_EXPIRY_HOURS = 24;
export const HELP_REQUEST_EXPIRY_HOURS = 24;

export const BACK_MAP: Record<string, string | null> = {
  '/home': null,
  '/chore/create': '/home',
  '/chore/:id': '/home',
  '/help-request/:id': '/home',
  '/thanks/:id': '/home',
  '/rewards': '/home',
  '/onboarding/create': null,
  '/onboarding/enter': null,
};
