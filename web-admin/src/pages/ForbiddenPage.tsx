import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { homePathForRole } from '../shared/permissions';

export function ForbiddenPage() {
  const user = useAuthStore((s) => s.user);
  const home = user?.home_path ?? homePathForRole(user?.role);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-4">
      <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <p className="text-5xl font-bold text-amber-400">403</p>
        <h2 className="mt-3 text-xl font-semibold text-slate-100">
          Acesso negado
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Seu perfil não tem permissão para acessar esta página.
        </p>
        <Link
          to={home}
          className="mt-6 inline-flex rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
