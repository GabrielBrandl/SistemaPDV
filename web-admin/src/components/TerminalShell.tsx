import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { can } from '../shared/permissions';
import { logoutRemote } from '../services/api';

/** Moldura de tela cheia para terminais (/t/*), sem menu lateral */
export function TerminalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const navigate = useNavigate();
  const role = user?.role_normalized ?? user?.role;
  const home = user?.home_path;

  const links = [
    { to: '/t/recarga', label: 'Recarga', show: can(role, 'recharge.create') },
    { to: '/t/caixa', label: 'Caixa', show: can(role, 'cash.open') },
    { to: '/t/pos', label: 'PDV', show: can(role, 'pos.sell') },
  ].filter((l) => l.show);

  const doLogout = async () => {
    await logoutRemote();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-amber-400">{title}</h1>
          <p className="truncate text-xs text-slate-400">
            {tenant?.nome ?? 'PDV Cashless'}
            {user?.name ? ` · ${user.name}` : ''}
          </p>
        </div>
        {links.length > 1 && (
          <nav className="flex gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        {home && home !== '/login' && home.startsWith('/') && !home.startsWith('/t/') && (
          <Link
            to={home}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Painel
          </Link>
        )}
        <button
          type="button"
          onClick={doLogout}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-slate-800"
        >
          <LogOut size={16} />
          Sair
        </button>
      </header>
      <main className="mx-auto w-full max-w-3xl p-4">{children}</main>
    </div>
  );
}
