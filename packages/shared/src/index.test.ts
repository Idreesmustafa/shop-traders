import { describe, expect, it } from 'vitest';
import { VERSION } from './index.js';

describe('@shop/shared', () => {
  it('exposes a version', () => {
    expect(VERSION).toBe('0.0.0');
  });
});
