import { create } from 'zustand';

interface SettingsState {
  currency: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  setCurrency: (currency: string) => void;
  setLanguage: (language: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  syncFromProfile: (profile: { defaultCurrency?: string; language?: string }) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: 'USD',
  language: 'en',
  theme: 'system',
  setCurrency: (currency) => set({ currency }),
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  syncFromProfile: (profile) => set({
    ...(profile.defaultCurrency ? { currency: profile.defaultCurrency } : {}),
    ...(profile.language ? { language: profile.language } : {}),
  }),
}));
