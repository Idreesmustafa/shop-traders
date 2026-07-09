import { apiFetch } from '../../lib/apiClient.js';

export type AdminMe = {
  user: {
    id: string;
    role: 'super_admin' | 'support';
    audience: 'admin';
    permissions: readonly string[];
  };
};

export const fetchAdminMe = (): Promise<AdminMe> =>
  apiFetch<AdminMe>('/api/admin/v1/auth/me');

export const adminLogin = (email: string, password: string): Promise<void> =>
  apiFetch<{ user: unknown }>('/api/admin/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then(() => undefined);

export const adminLogout = (): Promise<void> =>
  apiFetch('/api/admin/v1/auth/logout', { method: 'POST' });
