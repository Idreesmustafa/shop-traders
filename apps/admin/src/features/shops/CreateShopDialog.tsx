import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { AdminPlan, CreateShopBody } from './shopsApi.js';

type FormValues = {
  shopName: string;
  ownerName: string;
  phone: string;
  email?: string;
  ownerEmail: string;
  ownerPassword: string;
  planCode: string;
};

type Props = {
  plans: readonly AdminPlan[];
  onClose: () => void;
  onSubmit: (body: CreateShopBody) => void;
  isSubmitting: boolean;
};

export const CreateShopDialog = ({
  plans,
  onClose,
  onSubmit,
  isSubmitting,
}: Props): JSX.Element => {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  const submit = handleSubmit((v) => {
    const body: CreateShopBody = {
      shop: { name: v.shopName, ownerName: v.ownerName, phone: v.phone, ...(v.email ? { email: v.email } : {}) },
      owner: { email: v.ownerEmail, name: v.ownerName, password: v.ownerPassword },
      planCode: v.planCode,
    };
    onSubmit(body);
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{t('shops.createShop')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => void submit(e)}
          noValidate
        >
          <Field label={t('shops.name')} error={errors.shopName?.message}>
            <input className={inputClass} {...register('shopName', { required: true })} />
          </Field>
          <Field label={t('shops.ownerName')} error={errors.ownerName?.message}>
            <input className={inputClass} {...register('ownerName', { required: true })} />
          </Field>
          <Field label={t('shops.phone')} error={errors.phone?.message}>
            <input className={inputClass} {...register('phone', { required: true })} />
          </Field>
          <Field label={t('shops.ownerEmail')} error={errors.ownerEmail?.message}>
            <input
              type="email"
              className={inputClass}
              {...register('ownerEmail', { required: true })}
            />
          </Field>
          <Field label={t('shops.ownerPassword')} error={errors.ownerPassword?.message}>
            <input
              type="password"
              className={inputClass}
              {...register('ownerPassword', { required: true, minLength: 8 })}
            />
          </Field>
          <Field label={t('shops.plan')} error={errors.planCode?.message}>
            <select className={inputClass} {...register('planCode', { required: true })}>
              <option value="">—</option>
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting ? t('shops.creating') : t('shops.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputClass =
  'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}): JSX.Element => (
  <div>
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    {children}
    {error !== undefined ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
  </div>
);
