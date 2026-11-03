import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth';
import { normalizeRole } from '../shared/permissions';

const baseURL = import.meta.env.VITE_API_BASE || '/api/v1';

const api = axios.create({ baseURL });

/** Cliente sem interceptors, usado apenas para renovar o token */
const rawApi = axios.create({ baseURL });

type ApiErrorBody = {
  ok?: false;
  error?: { code?: string; message?: string };
  message?: string | string[];
};

/** Erro normalizado: mantém `response` para compatibilidade com telas antigas */
export class ApiError extends Error {
  code?: string;
  status?: number;
  response?: AxiosError['response'];
}

export function getErrorMessage(err: unknown, fallback = 'Erro inesperado') {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function normalizeError(error: unknown): unknown {
  if (!axios.isAxiosError(error)) return error;
  const data = error.response?.data as ApiErrorBody | undefined;
  const rawMessage = data?.error?.message ?? data?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(', ')
    : rawMessage || error.message || 'Erro de comunicação com o servidor';

  const apiError = new ApiError(message);
  apiError.code = data?.error?.code;
  apiError.status = error.response?.status;
  apiError.response = error.response;
  if (error.response && error.response.data && typeof error.response.data === 'object') {
    // telas legadas leem err.response.data.message
    (error.response.data as ApiErrorBody).message = message;
  }
  return apiError;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pdv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const state = useAuthStore.getState();
  if (
    normalizeRole(state.user?.role_normalized ?? state.user?.role) ===
      'platform_admin' &&
    state.impersonateTenantId
  ) {
    config.headers['X-Tenant-Id'] = state.impersonateTenantId;
  }

  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const { data } = await rawApi.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    setTokens(data.access_token, data.refresh_token ?? refreshToken);
    return data.access_token as string;
  } catch {
    return null;
  }
}

function forceLogout() {
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config) {
      const original = error.config as RetriableConfig;
      const url = original.url ?? '';
      const isAuthCall =
        url.includes('/auth/login') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/pin');

      if (!original._retry && !isAuthCall && useAuthStore.getState().token) {
        original._retry = true;
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;

        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          try {
            return await api.request(original);
          } catch (retryError) {
            return Promise.reject(normalizeError(retryError));
          }
        }

        forceLogout();
      }
    }
    return Promise.reject(normalizeError(error));
  },
);

/** Encerra sessão no backend (best effort) e limpa o estado local */
export async function logoutRemote() {
  const { refreshToken, logout } = useAuthStore.getState();
  try {
    if (refreshToken) {
      await rawApi.post('/auth/logout', { refresh_token: refreshToken });
    }
  } catch {
    /* ignore */
  } finally {
    logout();
  }
}

export default api;
