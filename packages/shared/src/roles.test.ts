import { describe, expect, it } from 'vitest';
import {
  PLATFORM_ROLE_PERMISSIONS,
  SHOP_ROLE_PERMISSIONS,
  hasPermission,
} from './roles.js';

describe('shop role permissions', () => {
  it('cashier cannot view cost or profit', () => {
    expect(SHOP_ROLE_PERMISSIONS.cashier).not.toContain('products.viewCost');
    expect(SHOP_ROLE_PERMISSIONS.cashier).not.toContain('reports.viewProfit');
  });

  it('cashier cannot override discount cap', () => {
    expect(SHOP_ROLE_PERMISSIONS.cashier).toContain('sales.discount');
    expect(SHOP_ROLE_PERMISSIONS.cashier).not.toContain('sales.discountOverride');
  });

  it('manager cannot manage users or subscriptions', () => {
    expect(SHOP_ROLE_PERMISSIONS.manager).not.toContain('users.create');
    expect(SHOP_ROLE_PERMISSIONS.manager).not.toContain('users.update');
  });

  it('owner has profit visibility and full account control', () => {
    expect(SHOP_ROLE_PERMISSIONS.owner).toContain('reports.viewProfit');
    expect(SHOP_ROLE_PERMISSIONS.owner).toContain('accounts.transfer');
  });
});

describe('platform role permissions', () => {
  it('super_admin has platform-wide wildcard', () => {
    expect(PLATFORM_ROLE_PERMISSIONS.super_admin).toEqual(['platform.*']);
  });

  it('support cannot mutate billing or plans', () => {
    const support = PLATFORM_ROLE_PERMISSIONS.support;
    expect(support).toContain('platform.shops.read');
    expect(support).not.toContain('platform.plans.write');
    expect(support).not.toContain('platform.subscriptions.write');
  });
});

describe('hasPermission', () => {
  it('grants direct matches', () => {
    expect(hasPermission(['sales.create'], 'sales.create')).toBe(true);
  });

  it('rejects unknown permissions', () => {
    expect(hasPermission(['sales.create'], 'sales.delete')).toBe(false);
  });

  it('grants via prefix wildcard', () => {
    expect(hasPermission(['platform.*'], 'platform.shops.read')).toBe(true);
    expect(hasPermission(['platform.*'], 'sales.create')).toBe(false);
  });
});
