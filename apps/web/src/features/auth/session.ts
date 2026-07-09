import type { ModuleCode, Permission, ShopRole } from '@shop/shared';
import { apiFetch } from '../../lib/apiClient.js';

export type Me = {
  user: {
    id: string;
    role: ShopRole;
    shopId: string;
    permissions: readonly Permission[];
  };
  subscription:
    | {
        planCode: string;
        status: 'trial' | 'active' | 'grace' | 'suspended';
        effectiveModules: readonly ModuleCode[];
        periodEndAt: string;
        graceEndAt: string;
      }
    | null;
};

export const fetchMe = (): Promise<Me> =>
  apiFetch<Me>('/api/v1/me/entitlements');

export const login = (email: string, password: string): Promise<void> =>
  apiFetch<{ user: unknown }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then(() => undefined);

export const logout = (): Promise<void> =>
  apiFetch('/api/v1/auth/logout', { method: 'POST' });
