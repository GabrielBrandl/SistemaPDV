import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plug,
  Radio,
  Receipt,
  RefreshCw,
  Shield,
  ShoppingBag,
  Store,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

const COLLAPSE_KEY = 'pdv-sidebar-collapsed';

type NavItem = { to: string; label: string; icon: LucideIcon };

export function Layout({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const impersonateTenantId = useAuthStore((s) => s.impersonateTenantId);
  const setImpersonateTenantId = useAuthStore((s) => s.setImpersonateTenantId);
  const navigate = useNavigate();
  const location = useLocation();
  const isSuper = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuper;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const links: NavItem[] = [
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

  const exitTenant = () => {
    setImpersonateTenantId(null);
    navigate('/tenants');
  };

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-dvh bg-slate-950">
      {/* Desktop */}
      <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
        <Sidebar
          links={links}
          isSuper={isSuper}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          userName={user?.name}
          userRole={user?.role}
          tenantName={tenant?.nome}
          impersonateTenantId={impersonateTenantId}
          onExitTenant={exitTenant}
          onLogout={doLogout}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(18rem,88vw)] shadow-2xl">
            <Sidebar
              links={links}
              isSuper={isSuper}
              collapsed={false}
              showClose
              onClose={() => setMobileOpen(false)}
              userName={user?.name}
              userRole={user?.role}
              tenantName={tenant?.nome}
              impersonateTenantId={impersonateTenantId}
              onExitTenant={exitTenant}
              onLogout={doLogout}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-800 bg-slate-950/95 px-3 py-3 backdrop-blur md:hidden pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-200"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-amber-400">
              PDV Cashless
            </p>
            {(tenant?.nome || impersonateTenantId) && (
              <p className="truncate text-xs text-slate-400">
                {tenant?.nome || 'Tenant'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={doLogout}
            className="rounded-lg p-2 text-red-400"
            aria-label="Sair"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  links,
  isSuper,
  collapsed,
  onToggleCollapse,
  showClose,
  onClose,
  onNavigate,
  userName,
  userRole,
  tenantName,
  impersonateTenantId,
  onExitTenant,
  onLogout,
}: {
  links: NavItem[];
  isSuper: boolean;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  userName?: string;
  userRole?: string;
  tenantName?: string;
  impersonateTenantId: string | null;
  onExitTenant: () => void;
  onLogout: () => void;
}) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
      collapsed ? 'justify-center px-2' : ''
    } ${
      isActive
        ? 'bg-amber-500/20 text-amber-300'
        : 'text-slate-300 hover:bg-slate-800'
    }`;

  return (
    <aside
      className={`flex h-full flex-col border-r border-slate-800 bg-slate-900 p-3 transition-[width] duration-200 ${
        collapsed ? 'w-[4.5rem]' : 'w-64'
      } ${showClose ? '!w-full' : ''}`}
    >
      <div className={`mb-6 ${collapsed ? 'text-center' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className={collapsed ? 'w-full' : 'min-w-0 flex-1'}>
            <h1
              className={`font-bold text-amber-400 ${
                collapsed ? 'text-sm' : 'text-xl'
              }`}
            >
              {collapsed ? 'PDV' : 'PDV Cashless'}
            </h1>
            {!collapsed && (
              <>
                <p className="mt-1 text-xs text-slate-400">SaaS Multi-tenant</p>
                {(tenantName || impersonateTenantId) && (
                  <p className="mt-2 truncate text-xs text-amber-300/80">
                    {tenantName ||
                      `Tenant ${impersonateTenantId?.slice(0, 8)}...`}
                  </p>
                )}
              </>
            )}
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              className="hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 md:inline-flex"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expandir menu' : 'Minimizar menu'}
              title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
          {showClose && (
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              onClick={onClose}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
        {isSuper && (
          <NavLink
            to="/tenants"
            title="Tenants"
            className={linkClass}
            onClick={onNavigate}
          >
            <Building2 size={18} className="shrink-0" />
            {!collapsed && <span>Tenants</span>}
          </NavLink>
        )}
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={linkClass}
            onClick={onNavigate}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div
        className={`space-y-2 border-t border-slate-800 pt-4 ${
          collapsed ? 'text-center' : ''
        }`}
      >
        {!collapsed && (
          <>
            <p className="truncate text-sm text-slate-400">{userName}</p>
            <p className="text-xs text-slate-500">{userRole}</p>
          </>
        )}
        {isSuper && impersonateTenantId && !collapsed && (
          <button
            type="button"
            onClick={onExitTenant}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Sair do tenant
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          title="Sair"
          className={`flex items-center gap-2 text-sm text-red-400 hover:text-red-300 ${
            collapsed ? 'mx-auto justify-center' : ''
          }`}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  );
}
