import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage.js';
import { AdminShell } from './features/layout/AdminShell.js';
import { ShopsListPage } from './features/shops/ShopsListPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const PlansPlaceholder = (): JSX.Element => (
  <div>
    <h1 className="text-lg font-semibold text-slate-900">Plans</h1>
    <p className="mt-2 text-sm text-slate-500">Plans management lands in Phase 7.</p>
  </div>
);

export const App = (): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminShell />}>
          <Route index element={<ShopsListPage />} />
          <Route path="plans" element={<PlansPlaceholder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
