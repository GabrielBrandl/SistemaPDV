import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Layout } from './Layout';

export function ProtectedRoute({ bare = false }: { bare?: boolean }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  // Operador de saída só acessa /saida
  if (user?.role === 'exit' && location.pathname !== '/saida') {
    return <Navigate to="/saida" replace />;
  }

  if (bare || user?.role === 'exit') {
    return <Outlet />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
