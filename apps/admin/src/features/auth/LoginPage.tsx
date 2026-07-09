import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@shop/shared';
import { isApiError } from '../../lib/apiClient.js';
import { adminLogin } from './session.js';

export const LoginPage = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginInput) => adminLogin(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminMe'] });
      navigate('/');
    },
  });

  const errorMessage =
    mutation.error !== null && isApiError(mutation.error)
      ? mutation.error.message
      : mutation.error !== null
        ? t('common.error')
        : null;

  return (
    <div className="flex h-full items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-slate-900">{t('auth.signIn')}</h1>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            void handleSubmit((data) => mutation.mutate(data))(e);
          }}
          noValidate
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register('email')}
            />
            {errors.email !== undefined ? (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register('password')}
            />
            {errors.password !== undefined ? (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            ) : null}
          </div>
          {errorMessage !== null ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {mutation.isPending ? t('auth.signingIn') : t('auth.signInAction')}
          </button>
        </form>
      </div>
    </div>
  );
};
