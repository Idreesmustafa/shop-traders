import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createShop, listPlans, listShops } from './shopsApi.js';
import { CreateShopDialog } from './CreateShopDialog.js';

export const ShopsListPage = (): JSX.Element => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const shopsQuery = useQuery({ queryKey: ['shops', 1, 20], queryFn: () => listShops(1, 20) });
  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: listPlans });

  const createMutation = useMutation({
    mutationFn: createShop,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shops'] });
      setDialogOpen(false);
    },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{t('nav.shops')}</h1>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t('shops.createShop')}
        </button>
      </div>

      {shopsQuery.isLoading ? (
        <div className="text-sm text-slate-500">{t('common.loading')}</div>
      ) : shopsQuery.isError ? (
        <div className="text-sm text-red-600">{t('common.error')}</div>
      ) : shopsQuery.data === undefined || shopsQuery.data.items.length === 0 ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-slate-500">
          {t('shops.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t('shops.columns.name')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('shops.columns.phone')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('shops.columns.status')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('shops.columns.created')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shopsQuery.data.items.map((shop) => (
                <tr key={shop._id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{shop.name}</td>
                  <td className="px-3 py-2 text-slate-600">{shop.phone}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {shop.isActive ? 'active' : 'inactive'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {new Date(shop.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen ? (
        <CreateShopDialog
          plans={plansQuery.data ?? []}
          onClose={() => setDialogOpen(false)}
          onSubmit={(body) => createMutation.mutate(body)}
          isSubmitting={createMutation.isPending}
        />
      ) : null}
    </div>
  );
};
