export const SHOP_ROLES = ['owner', 'manager', 'cashier'] as const;
export type ShopRole = (typeof SHOP_ROLES)[number];

export const PLATFORM_ROLES = ['super_admin', 'support'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export type Permission = string;

const OWNER_PERMISSIONS: readonly Permission[] = [
  'shops.read',
  'shops.update',
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  'settings.read',
  'settings.update',
  'parties.read',
  'parties.create',
  'parties.update',
  'parties.delete',
  'products.read',
  'products.create',
  'products.update',
  'products.delete',
  'products.viewCost',
  'inventory.read',
  'inventory.adjust',
  'purchases.read',
  'purchases.create',
  'purchases.receive',
  'sales.read',
  'sales.create',
  'sales.discount',
  'sales.discountOverride',
  'sales.return',
  'payments.read',
  'payments.create',
  'khata.read',
  'khata.adjust',
  'accounts.read',
  'accounts.create',
  'accounts.update',
  'accounts.adjust',
  'accounts.transfer',
  'taxes.read',
  'taxes.create',
  'taxes.update',
  'taxes.delete',
  'templates.read',
  'templates.create',
  'templates.update',
  'templates.delete',
  'expenses.read',
  'expenses.create',
  'expenses.update',
  'expenses.delete',
  'reports.read',
  'reports.viewProfit',
];

const MANAGER_PERMISSIONS: readonly Permission[] = [
  'shops.read',
  'settings.read',
  'parties.read',
  'parties.create',
  'parties.update',
  'products.read',
  'products.create',
  'products.update',
  'products.viewCost',
  'inventory.read',
  'inventory.adjust',
  'purchases.read',
  'purchases.create',
  'purchases.receive',
  'sales.read',
  'sales.create',
  'sales.discount',
  'sales.return',
  'payments.read',
  'payments.create',
  'khata.read',
  'accounts.read',
  'accounts.transfer',
  'taxes.read',
  'templates.read',
  'expenses.read',
  'expenses.create',
  'reports.read',
];

const CASHIER_PERMISSIONS: readonly Permission[] = [
  'shops.read',
  'parties.read',
  'parties.create',
  'products.read',
  'inventory.read',
  'sales.read',
  'sales.create',
  'sales.discount',
  'payments.read',
  'payments.create',
  'khata.read',
  'accounts.read',
  'taxes.read',
];

export const SHOP_ROLE_PERMISSIONS: Record<ShopRole, readonly Permission[]> = {
  owner: OWNER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  cashier: CASHIER_PERMISSIONS,
};

const SUPER_ADMIN_PERMISSIONS: readonly Permission[] = ['platform.*'];
const SUPPORT_PERMISSIONS: readonly Permission[] = [
  'platform.shops.read',
  'platform.plans.read',
  'platform.subscriptions.read',
  'platform.impersonate',
  'platform.audit.read',
];

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, readonly Permission[]> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  support: SUPPORT_PERMISSIONS,
};

export const hasPermission = (
  granted: readonly Permission[],
  required: Permission,
): boolean => {
  if (granted.includes(required)) return true;
  for (const g of granted) {
    if (g.endsWith('.*')) {
      const prefix = g.slice(0, -1);
      if (required.startsWith(prefix)) return true;
    }
  }
  return false;
};

export const isShopRole = (v: unknown): v is ShopRole =>
  typeof v === 'string' && (SHOP_ROLES as readonly string[]).includes(v);

export const isPlatformRole = (v: unknown): v is PlatformRole =>
  typeof v === 'string' && (PLATFORM_ROLES as readonly string[]).includes(v);
