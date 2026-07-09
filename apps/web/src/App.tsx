import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage.js';
import { AppShell } from './features/layout/AppShell.js';
import { DashboardPage, StubPage } from './features/dashboard/DashboardPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export const App = (): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="sales" element={<StubPage titleKey="nav.sales" />} />
          <Route path="products" element={<StubPage titleKey="nav.products" />} />
          <Route path="parties" element={<StubPage titleKey="nav.parties" />} />
          <Route path="inventory" element={<StubPage titleKey="nav.inventory" />} />
          <Route path="purchases" element={<StubPage titleKey="nav.purchases" />} />
          <Route path="khata" element={<StubPage titleKey="nav.khata" />} />
          <Route path="accounts" element={<StubPage titleKey="nav.accounts" />} />
          <Route path="reports" element={<StubPage titleKey="nav.reports" />} />
          <Route path="settings" element={<StubPage titleKey="nav.settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
