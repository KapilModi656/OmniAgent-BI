import {atom} from 'jotai';

export const isSignedInState = atom(false);

export interface ChatItem {
	id: number;
	name: string;
	pipelineUrl: string | null;
	trainingUrl: string | null;
    modelMetrics?: string | null;
}

export const Chats = atom<ChatItem[]>([]);

export const CurrentChat = atom<number | null>(null);

export const edaUrls = atom<string[]>([]);

export type ThemeMode = 'light' | 'dark';
const getInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem('themeMode');
  if (saved === 'light' || saved === 'dark') return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'dark'; // Default premium look
};
export const themeModeAtom = atom<ThemeMode>(getInitialTheme());

export interface UserProfile {
  name: string;
  email: string;
}
export const userProfileAtom = atom<UserProfile | null>(null);
