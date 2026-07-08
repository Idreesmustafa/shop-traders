import { z } from 'zod';
import { MODULE_CODES, isModuleCode } from '@shop/shared';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const createShopSchema = z.object({
  shop: z.object({
    name: z.string().min(1).max(200),
    ownerName: z.string().min(1).max(200),
    phone: z.string().min(1).max(50),
    email: z.string().email().max(200).optional(),
    timezone: z.string().min(1).max(50).optional(),
    currency: z.string().min(3).max(10).optional(),
    pricesIncludeTax: z.boolean().optional(),
  }),
  owner: z.object({
    email: z.string().email().max(200),
    name: z.string().min(1).max(200),
    password: z.string().min(8).max(200),
  }),
  planCode: z.string().min(1),
});
export type CreateShopInput = z.infer<typeof createShopSchema>;

export const updateShopSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  ownerName: z.string().min(1).max(200).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().max(200).optional(),
  timezone: z.string().max(50).optional(),
  currency: z.string().min(3).max(10).optional(),
  pricesIncludeTax: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateShopInput = z.infer<typeof updateShopSchema>;

export const assignPlanSchema = z.object({
  planCode: z.string().min(1),
  status: z.enum(['trial', 'active', 'grace', 'suspended']).optional(),
});
export type AssignPlanInput = z.infer<typeof assignPlanSchema>;

const moduleCodeSchema = z
  .string()
  .refine((v): v is (typeof MODULE_CODES)[number] => isModuleCode(v), {
    message: 'unknown module code',
  });

export const setModulesSchema = z.object({
  effectiveModules: z.array(moduleCodeSchema).min(1),
});
export type SetModulesInput = z.infer<typeof setModulesSchema>;
