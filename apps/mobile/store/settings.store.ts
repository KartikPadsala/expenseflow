import { create } from 'zustand';

interface SettingsState {
  currency: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  setCurrency: (currency: string) => void;
  setLanguage: (language: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  language: 'en',
  theme: 'system',
  setCurrency: (currency) => set({ currency }),
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
}));
