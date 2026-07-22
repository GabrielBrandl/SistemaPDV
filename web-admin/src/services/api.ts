import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pdv_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const state = useAuthStore.getState();
  if (state.user?.role === 'super_admin' && state.impersonateTenantId) {
    config.headers['X-Tenant-Id'] = state.impersonateTenantId;
  }

  return config;
});

export default api;
