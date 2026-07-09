import { useTranslation } from 'react-i18next';

export const DashboardPage = (): JSX.Element => {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">{t('nav.dashboard')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        Placeholder — dashboard content lands in Phase 5.
      </p>
    </div>
  );
};

export const StubPage = ({ titleKey }: { titleKey: string }): JSX.Element => {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900">{t(titleKey)}</h1>
      <p className="mt-2 text-sm text-gray-500">Feature lands in a later phase.</p>
    </div>
  );
};
