import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminAuthState {
  token: string | null;
  admin: { id: string; email: string; role: string } | null;
  setAuth: (token: string, admin: { id: string; email: string; role: string }) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      setAuth: (token, admin) => { localStorage.setItem('admin_token', token); set({ token, admin }); },
      logout: () => { localStorage.removeItem('admin_token'); set({ token: null, admin: null }); },
      isAuthenticated: () => !!get().token && get().admin?.role === 'ADMIN',
    }),
    { name: 'admin-auth' },
  ),
);
