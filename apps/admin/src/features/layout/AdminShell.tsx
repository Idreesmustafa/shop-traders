import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { adminLogout, fetchAdminMe } from '../auth/session.js';

export const AdminShell = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['adminMe'],
    queryFn: fetchAdminMe,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: adminLogout,
    onSuccess: () => {
      queryClient.setQueryData(['adminMe'], null);
      navigate('/login');
    },
  });

  if (meQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        {t('common.loading')}
      </div>
    );
  }
  if (meQuery.isError || meQuery.data === undefined) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 shrink-0 border-r bg-white">
          <div className="border-b p-4">
            <div className="text-sm font-semibold">{t('app.name')}</div>
            <div className="mt-1 text-xs text-slate-500">Role: {meQuery.data.user.role}</div>
          </div>
          <nav className="p-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              {t('nav.shops')}
            </NavLink>
            <NavLink
              to="/plans"
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              {t('nav.plans')}
            </NavLink>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="mt-4 block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {t('nav.signOut')}
            </button>
          </nav>
        </aside>
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
