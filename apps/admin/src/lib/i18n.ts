import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  app: {
    name: 'Shop Traders — Admin',
  },
  nav: {
    shops: 'Shops',
    plans: 'Plans',
    signOut: 'Sign out',
  },
  auth: {
    signIn: 'Admin sign in',
    email: 'Email',
    password: 'Password',
    signInAction: 'Sign in',
    signingIn: 'Signing in...',
  },
  shops: {
    createShop: 'Create shop',
    name: 'Shop name',
    ownerName: 'Owner name',
    phone: 'Phone',
    ownerEmail: 'Owner email',
    ownerPassword: 'Owner password',
    plan: 'Plan',
    submit: 'Create',
    creating: 'Creating...',
    empty: 'No shops yet.',
    columns: {
      name: 'Name',
      phone: 'Phone',
      status: 'Status',
      created: 'Created',
    },
  },
  common: { loading: 'Loading...', error: 'Something went wrong.' },
} as const;

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
