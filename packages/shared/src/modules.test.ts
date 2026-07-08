import { describe, expect, it } from 'vitest';
import {
  MODULE_CODES,
  MODULES,
  SHOP_ASSIGNABLE_MODULES,
  isModuleCode,
} from './modules.js';

describe('module registry', () => {
  it('registers all 17 modules from CLAUDE.md', () => {
    expect(MODULE_CODES).toHaveLength(17);
    for (const code of MODULE_CODES) {
      expect(MODULES[code]?.code).toBe(code);
    }
  });

  it('marks platform-admin as not shop-assignable', () => {
    expect(MODULES['platform-admin']?.shopAssignable).toBe(false);
    expect(SHOP_ASSIGNABLE_MODULES).not.toContain('platform-admin');
  });

  it('shop-assignable modules are 16 (everything except platform-admin)', () => {
    expect(SHOP_ASSIGNABLE_MODULES).toHaveLength(16);
  });

  it('isModuleCode narrows on valid codes only', () => {
    expect(isModuleCode('sales')).toBe(true);
    expect(isModuleCode('imaginary')).toBe(false);
    expect(isModuleCode(42)).toBe(false);
  });
});
