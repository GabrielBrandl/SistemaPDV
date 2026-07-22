import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

interface TenantInfo {
  id: string;
  nome: string;
  slug: string;
  plano: string;
  status: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  tenant: TenantInfo | null;
  eventId: string | null;
  impersonateTenantId: string | null;
  setAuth: (token: string, user: User, tenant: TenantInfo | null) => void;
  setEventId: (id: string) => void;
  setImpersonateTenantId: (id: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      eventId: null,
      impersonateTenantId: null,
      setAuth: (token, user, tenant) => {
        localStorage.setItem('pdv_token', token);
        set({ token, user, tenant, impersonateTenantId: null });
      },
      setEventId: (id) => set({ eventId: id }),
      setImpersonateTenantId: (id) => set({ impersonateTenantId: id }),
      logout: () => {
        localStorage.removeItem('pdv_token');
        set({
          token: null,
          user: null,
          tenant: null,
          eventId: null,
          impersonateTenantId: null,
        });
      },
    }),
    { name: 'pdv-auth' },
  ),
);
