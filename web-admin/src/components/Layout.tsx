import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Package,
  Plug,
  Radio,
  Receipt,
  RefreshCw,
  Shield,
  ShoppingBag,
  Store,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

export function Layout({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const impersonateTenantId = useAuthStore((s) => s.impersonateTenantId);
  const setImpersonateTenantId = useAuthStore((s) => s.setImpersonateTenantId);
  const navigate = useNavigate();
  const isSuper = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuper;

  const links = [
    ...(isAdmin
      ? [{ to: '/admin', label: 'Controle Admin', icon: Shield }]
      : []),
    { to: '/cadastro', label: 'Cadastro Cliente', icon: UserPlus },
    { to: '/pos', label: 'PDV Comanda', icon: Store },
    { to: '/saida', label: 'Controle de Saída', icon: DoorOpen },
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/cards', label: 'Cartões NFC', icon: CreditCard },
    { to: '/recharge', label: 'Recarga', icon: RefreshCw },
    { to: '/products', label: 'Cardápio', icon: ShoppingBag },
    { to: '/reports', label: 'Relatórios', icon: Receipt },
    { to: '/pdv', label: 'Terminais PDV', icon: Radio },
    { to: '/fiscal', label: 'Emitidor NFC-e', icon: Package },
    ...(isAdmin
      ? [{ to: '/integrations', label: 'Integrações', icon: Plug }]
      : []),
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-slate-800 bg-slate-900 p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-amber-400">PDV Cashless</h1>
          <p className="text-xs text-slate-400 mt-1">SaaS Multi-tenant</p>
          {(tenant || impersonateTenantId) && (
            <p className="text-xs text-amber-300/80 mt-2 truncate">
              {tenant?.nome || `Tenant ${impersonateTenantId?.slice(0, 8)}...`}
            </p>
          )}
        </div>
        <nav className="flex-1 space-y-1">
          {isSuper && (
            <NavLink
              to="/tenants"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Building2 size={18} />
              Tenants
            </NavLink>
          )}
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <p className="text-sm text-slate-400 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.role}</p>
          {isSuper && impersonateTenantId && (
            <button
              onClick={() => {
                setImpersonateTenantId(null);
                navigate('/tenants');
              }}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Sair do tenant
            </button>
          )}
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-2 flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
