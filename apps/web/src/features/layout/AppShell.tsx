import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import type { ModuleCode } from '@shop/shared';
import { fetchMe, logout, type Me } from '../auth/session.js';

type NavItem = { to: string; labelKey: string; module: ModuleCode };

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', module: 'reports' },
  { to: '/sales', labelKey: 'nav.sales', module: 'sales' },
  { to: '/products', labelKey: 'nav.products', module: 'products' },
  { to: '/parties', labelKey: 'nav.parties', module: 'parties' },
  { to: '/inventory', labelKey: 'nav.inventory', module: 'inventory' },
  { to: '/purchases', labelKey: 'nav.purchases', module: 'purchases' },
  { to: '/khata', labelKey: 'nav.khata', module: 'khata' },
  { to: '/accounts', labelKey: 'nav.accounts', module: 'accounts' },
  { to: '/reports', labelKey: 'nav.reports', module: 'reports' },
  { to: '/settings', labelKey: 'nav.settings', module: 'settings' },
];

const SubscriptionBanner = ({ me }: { me: Me }): JSX.Element | null => {
  const { t } = useTranslation();
  const status = me.subscription?.status;
  if (status === 'grace') {
    return (
      <div className="bg-amber-100 px-4 py-2 text-sm text-amber-900">
        {t('subscription.grace')}
      </div>
    );
  }
  if (status === 'suspended') {
    return (
      <div className="bg-red-100 px-4 py-2 text-sm text-red-900">
        {t('subscription.suspended')}
      </div>
    );
  }
  return null;
};

export const AppShell = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const meQuery = useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      navigate('/login');
    },
  });

  if (meQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        {t('common.loading')}
      </div>
    );
  }
  if (meQuery.isError) {
    return <Navigate to="/login" replace />;
  }
  const me = meQuery.data;
  if (me === undefined) return <Navigate to="/login" replace />;

  const enabledModules = new Set<ModuleCode>(
    me.subscription?.effectiveModules ?? [],
  );

  return (
    <div className="flex h-full flex-col">
      <SubscriptionBanner me={me} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 shrink-0 border-r bg-white">
          <div className="border-b p-4">
            <div className="text-sm font-semibold">{t('app.name')}</div>
            <div className="mt-1 text-xs text-gray-500">Role: {me.user.role}</div>
          </div>
          <nav className="p-2">
            {NAV_ITEMS.filter((item) => enabledModules.has(item.module)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block rounded px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="mt-4 block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('nav.signOut')}
            </button>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
