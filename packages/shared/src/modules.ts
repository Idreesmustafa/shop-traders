export const MODULE_CODES = [
  'platform-admin',
  'auth',
  'shops',
  'subscriptions',
  'parties',
  'products',
  'inventory',
  'purchases',
  'sales',
  'payments',
  'khata',
  'accounts',
  'taxes',
  'templates',
  'expenses',
  'reports',
  'settings',
] as const;

export type ModuleCode = (typeof MODULE_CODES)[number];

export type ModuleDescriptor = {
  code: ModuleCode;
  name: string;
  description: string;
  shopAssignable: boolean;
};

export const MODULES: Record<ModuleCode, ModuleDescriptor> = {
  'platform-admin': {
    code: 'platform-admin',
    name: 'Platform admin',
    description: 'Super-admin plane; never assignable to a shop.',
    shopAssignable: false,
  },
  auth: { code: 'auth', name: 'Auth', description: 'Login and identity.', shopAssignable: true },
  shops: {
    code: 'shops',
    name: 'Shop profile',
    description: 'Shop profile and users.',
    shopAssignable: true,
  },
  subscriptions: {
    code: 'subscriptions',
    name: 'Subscription',
    description: 'Plan, status, and entitlements read.',
    shopAssignable: true,
  },
  parties: {
    code: 'parties',
    name: 'Parties',
    description: 'Customers and suppliers.',
    shopAssignable: true,
  },
  products: {
    code: 'products',
    name: 'Products',
    description: 'Catalogue, units, and prices.',
    shopAssignable: true,
  },
  inventory: {
    code: 'inventory',
    name: 'Inventory',
    description: 'Stock movements and adjustments.',
    shopAssignable: true,
  },
  purchases: {
    code: 'purchases',
    name: 'Purchases',
    description: 'Buy from suppliers.',
    shopAssignable: true,
  },
  sales: {
    code: 'sales',
    name: 'Sales',
    description: 'Sell to customers, invoicing.',
    shopAssignable: true,
  },
  payments: {
    code: 'payments',
    name: 'Payments',
    description: 'Receive and record payments.',
    shopAssignable: true,
  },
  khata: {
    code: 'khata',
    name: 'Khata',
    description: 'Party credit ledgers.',
    shopAssignable: true,
  },
  accounts: {
    code: 'accounts',
    name: 'Accounts',
    description: 'Cash, bank, and wallet balances.',
    shopAssignable: true,
  },
  taxes: {
    code: 'taxes',
    name: 'Taxes',
    description: 'Shop-defined tax definitions.',
    shopAssignable: true,
  },
  templates: {
    code: 'templates',
    name: 'Invoice templates',
    description: 'Document design and rendering.',
    shopAssignable: true,
  },
  expenses: {
    code: 'expenses',
    name: 'Expenses',
    description: 'Day-to-day spending.',
    shopAssignable: true,
  },
  reports: {
    code: 'reports',
    name: 'Reports',
    description: 'Read-only views over the shop.',
    shopAssignable: true,
  },
  settings: {
    code: 'settings',
    name: 'Settings',
    description: 'Shop settings and preferences.',
    shopAssignable: true,
  },
};

export const SHOP_ASSIGNABLE_MODULES: readonly ModuleCode[] = MODULE_CODES.filter(
  (c) => MODULES[c].shopAssignable,
);

export const isModuleCode = (v: unknown): v is ModuleCode =>
  typeof v === 'string' && (MODULE_CODES as readonly string[]).includes(v);
