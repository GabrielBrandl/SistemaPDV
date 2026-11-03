import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ProtectedRoute,
  PublicOrAuthedLayout,
} from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { OnboardPage } from './pages/OnboardPage';
import { PlansPage } from './pages/PlansPage';
import { DashboardPage } from './pages/DashboardPage';
import { CardsPage } from './pages/CardsPage';
import { RechargePage } from './pages/RechargePage';
import { TerminalRechargePage } from './pages/TerminalRechargePage';
import { CashPage } from './pages/CashPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReportsPage } from './pages/ReportsPage';
import { PdvPage } from './pages/PdvPage';
import { FiscalPage } from './pages/FiscalPage';
import { TenantsPage } from './pages/TenantsPage';
import { PlatformDashboardPage } from './pages/PlatformDashboardPage';
import { CompanyDetailPage } from './pages/CompanyDetailPage';
import { TeamPage } from './pages/TeamPage';
import { BillingPage } from './pages/BillingPage';
import { PosPage } from './pages/PosPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { ExitGatePage } from './pages/ExitGatePage';
import { AdminControlPage } from './pages/AdminControlPage';
import { CadastroPage } from './pages/CadastroPage';
import { PhonePayPage } from './pages/PhonePayPage';
import { LandingPage } from './pages/LandingPage';
import { LeadsPage } from './pages/LeadsPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboard" element={<OnboardPage />} />
          <Route
            path="/precos"
            element={
              <PublicOrAuthedLayout>
                <PlansPage />
              </PublicOrAuthedLayout>
            }
          />

          {/* Terminais fullscreen (/t/*) */}
          <Route element={<ProtectedRoute bare permission="pos.sell" />}>
            <Route path="/t/pos" element={<PosPage />} />
          </Route>
          <Route element={<ProtectedRoute bare permission="recharge.create" />}>
            <Route path="/t/recarga" element={<TerminalRechargePage />} />
          </Route>
          <Route element={<ProtectedRoute bare permission="exit.control" />}>
            <Route path="/t/saida" element={<ExitGatePage />} />
          </Route>
          <Route element={<ProtectedRoute bare permission="cash.open" />}>
            <Route path="/t/caixa" element={<CashPage />} />
          </Route>

          {/* Telas fullscreen legadas (maquininha / saída / pagamento) */}
          <Route element={<ProtectedRoute bare permission="exit.control" />}>
            <Route path="/saida" element={<ExitGatePage />} />
          </Route>
          <Route element={<ProtectedRoute bare permission="pos.sell" />}>
            <Route path="/pagar" element={<PhonePayPage />} />
            <Route path="/pos" element={<PosPage />} />
          </Route>

          {/* Painel administrativo */}
          <Route element={<ProtectedRoute permission="reports.view" />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="tenant.manage" />}>
            <Route path="/admin" element={<AdminControlPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="customers.manage" />}>
            <Route path="/cadastro" element={<CadastroPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="platform.manage" />}>
            <Route path="/platform" element={<PlatformDashboardPage />} />
            <Route path="/platform/empresas" element={<TenantsPage />} />
            <Route
              path="/platform/empresas/:id"
              element={<CompanyDetailPage />}
            />
            <Route path="/platform/leads" element={<LeadsPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="team.manage" />}>
            <Route path="/equipe" element={<TeamPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="billing.view" />}>
            <Route path="/billing" element={<BillingPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="cards.manage" />}>
            <Route path="/cards" element={<CardsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="recharge.create" />}>
            <Route path="/recharge" element={<RechargePage />} />
          </Route>
          <Route element={<ProtectedRoute permission="products.manage" />}>
            <Route path="/products" element={<ProductsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="terminals.manage" />}>
            <Route path="/pdv" element={<PdvPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="fiscal.manage" />}>
            <Route path="/fiscal" element={<FiscalPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="integrations.manage" />}>
            <Route path="/integrations" element={<IntegrationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
