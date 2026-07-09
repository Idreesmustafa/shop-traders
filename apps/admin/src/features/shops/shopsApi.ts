import type { ModuleCode } from '@shop/shared';
import { apiFetch } from '../../lib/apiClient.js';

export type AdminShop = {
  _id: string;
  name: string;
  ownerName: string;
  phone: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
};

export type ShopsPage = {
  items: readonly AdminShop[];
  page: number;
  limit: number;
  total: number;
};

export const listShops = (page = 1, limit = 20): Promise<ShopsPage> =>
  apiFetch<ShopsPage>(`/api/admin/v1/shops?page=${page}&limit=${limit}`);

export type CreateShopBody = {
  shop: { name: string; ownerName: string; phone: string; email?: string };
  owner: { email: string; name: string; password: string };
  planCode: string;
};

export const createShop = (body: CreateShopBody): Promise<{ shopId: string }> =>
  apiFetch('/api/admin/v1/shops', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export type AdminPlan = {
  _id: string;
  code: string;
  name: string;
  modules: readonly ModuleCode[];
  pricePaisa: number;
  billingCycle: 'monthly' | 'yearly';
};

export const listPlans = (): Promise<readonly AdminPlan[]> =>
  apiFetch('/api/admin/v1/plans');

export const assignPlan = (
  shopId: string,
  planCode: string,
): Promise<unknown> =>
  apiFetch(`/api/admin/v1/shops/${shopId}/plan`, {
    method: 'POST',
    body: JSON.stringify({ planCode }),
  });

export const setModules = (
  shopId: string,
  effectiveModules: readonly ModuleCode[],
): Promise<unknown> =>
  apiFetch(`/api/admin/v1/shops/${shopId}/modules`, {
    method: 'PATCH',
    body: JSON.stringify({ effectiveModules }),
  });
