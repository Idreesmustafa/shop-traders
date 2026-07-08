import { describe, expect, it } from 'vitest';
import { useMongo } from '../../test-utils/mongo.js';
import { ShopModel } from './shops.model.js';

useMongo();

describe('ShopModel', () => {
  it('creates a shop with defaults for timezone, currency, and pricesIncludeTax', async () => {
    const shop = await ShopModel.create({
      name: 'Ali General Store',
      ownerName: 'Ali',
      phone: '+92 300 1234567',
    });
    expect(shop.timezone).toBe('Asia/Karachi');
    expect(shop.currency).toBe('PKR');
    expect(shop.pricesIncludeTax).toBe(false);
    expect(shop.isActive).toBe(true);
    expect(shop.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a shop missing required fields', async () => {
    await expect(
      ShopModel.create({ name: 'No Owner' }),
    ).rejects.toThrow();
  });
});
