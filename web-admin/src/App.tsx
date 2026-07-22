import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { OnboardPage } from './pages/OnboardPage';
import { DashboardPage } from './pages/DashboardPage';
import { CardsPage } from './pages/CardsPage';
import { RechargePage } from './pages/RechargePage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';
import { PdvPage } from './pages/PdvPage';
import { FiscalPage } from './pages/FiscalPage';
import { TenantsPage } from './pages/TenantsPage';
import { PosPage } from './pages/PosPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { ExitGatePage } from './pages/ExitGatePage';
import { AdminControlPage } from './pages/AdminControlPage';
import { CadastroPage } from './pages/CadastroPage';
import { PhonePayPage } from './pages/PhonePayPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboard" element={<OnboardPage />} />

          {/* Painéis fullscreen (celular / saída) */}
          <Route element={<ProtectedRoute bare />}>
            <Route path="/saida" element={<ExitGatePage />} />
            <Route path="/pagar" element={<PhonePayPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminControlPage />} />
            <Route path="/cadastro" element={<CadastroPage />} />
            <Route path="/pos" element={<PosPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/recharge" element={<RechargePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/pdv" element={<PdvPage />} />
            <Route path="/fiscal" element={<FiscalPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
