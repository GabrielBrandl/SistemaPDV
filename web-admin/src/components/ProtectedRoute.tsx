import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Layout } from './Layout';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import {
  can,
  homePathForRole,
  normalizeRole,
  type Permission,
} from '../shared/permissions';

/** Papéis operacionais: ao acessar rota proibida voltam para o terminal deles */
const RESTRICTED_ROLES = ['exit', 'cashier', 'bartender', 'platform_admin'];
const EXIT_PATHS = ['/t/saida', '/saida'];

export function ProtectedRoute({
  bare = false,
  permission,
}: {
  bare?: boolean;
  permission?: Permission;
}) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token || !user) return <Navigate to="/login" replace />;

  const roleKey = user.role_normalized ?? user.role;
  const role = normalizeRole(roleKey);
  const home = user.home_path ?? homePathForRole(roleKey);
  const pathname = location.pathname;

  // Operador de saída só acessa a tela de saída
  if (role === 'exit' && !EXIT_PATHS.includes(pathname)) {
    return <Navigate to="/t/saida" replace />;
  }

  // Terminais /t/* e operador de saída usam tela cheia, sem menu
  const withShell = !(bare || pathname.startsWith('/t/') || role === 'exit');

  if (permission && !can(roleKey, permission)) {
    if (role && RESTRICTED_ROLES.includes(role) && home !== pathname) {
      return <Navigate to={home} replace />;
    }
    return withShell ? (
      <Layout>
        <ForbiddenPage />
      </Layout>
    ) : (
      <ForbiddenPage />
    );
  }

  if (!withShell) {
    return <Outlet />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

/** Public page that keeps the admin shell when the user is already logged in. */
export function PublicOrAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  if (token && normalizeRole(user?.role_normalized ?? user?.role) !== 'exit') {
    return <Layout>{children}</Layout>;
  }

  return <>{children}</>;
}
