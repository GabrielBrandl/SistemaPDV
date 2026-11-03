import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  can,
  homePathForRole,
  normalizeRole,
  type AppRole,
  type Permission,
} from '../shared/permissions';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  role_normalized?: string | null;
  home_path?: string;
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
  refreshToken: string | null;
  user: User | null;
  tenant: TenantInfo | null;
  eventId: string | null;
  impersonateTenantId: string | null;
  setAuth: (
    token: string,
    user: User,
    tenant: TenantInfo | null,
    refreshToken?: string | null,
  ) => void;
  setTokens: (token: string, refreshToken: string | null) => void;
  setEventId: (id: string) => void;
  setImpersonateTenantId: (id: string | null) => void;
  logout: () => void;
  /** Papel normalizado (platform_admin, tenant_admin, ...) */
  getRole: () => AppRole | null;
  hasPermission: (permission: Permission) => boolean;
  getHomePath: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      tenant: null,
      eventId: null,
      impersonateTenantId: null,
      setAuth: (token, user, tenant, refreshToken = null) => {
        localStorage.setItem('pdv_token', token);
        set({
          token,
          refreshToken,
          user,
          tenant,
          impersonateTenantId: null,
        });
      },
      setTokens: (token, refreshToken) => {
        localStorage.setItem('pdv_token', token);
        set({ token, refreshToken });
      },
      setEventId: (id) => set({ eventId: id }),
      setImpersonateTenantId: (id) => set({ impersonateTenantId: id }),
      logout: () => {
        localStorage.removeItem('pdv_token');
        set({
          token: null,
          refreshToken: null,
          user: null,
          tenant: null,
          eventId: null,
          impersonateTenantId: null,
        });
      },
      getRole: () => {
        const user = get().user;
        return normalizeRole(user?.role_normalized ?? user?.role);
      },
      hasPermission: (permission) => {
        const user = get().user;
        return can(user?.role_normalized ?? user?.role, permission);
      },
      getHomePath: () => {
        const user = get().user;
        return user?.home_path ?? homePathForRole(user?.role);
      },
    }),
    { name: 'pdv-auth' },
  ),
);
