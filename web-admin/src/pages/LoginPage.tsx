import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setEventId = useAuthStore((s) => s.setEventId);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.access_token, data.user, data.tenant);

      if (data.user.role === 'super_admin') {
        navigate('/platform');
        return;
      }

      if (data.user.role === 'exit') {
        navigate('/saida');
        return;
      }

      const events = await api.get('/events');
      if (events.data.length > 0) {
        setEventId(events.data[0].id);
      }

      if (data.user.role === 'admin') {
        navigate('/admin');
        return;
      }

      navigate('/pos');
    } catch {
      setError('Credenciais inválidas ou tenant suspenso');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-950">
      <div className="grid min-h-dvh lg:grid-cols-2">
        <aside className="relative flex flex-col justify-between overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-8 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-amber-600/10 blur-3xl" />
          </div>
          <div className="relative">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-400/90">
              PDV Cashless
            </p>
            <h1 className="mt-4 max-w-md text-3xl font-bold leading-tight text-slate-50 md:text-4xl">
              Cashless para bares e eventos, sem fricção
            </h1>
            <p className="mt-4 max-w-md text-slate-400">
              NFC, PDV, saída e fechamento em uma plataforma multi-tenant —
              planos Starter, Pro e Enterprise.
            </p>
          </div>
          <div className="relative mt-10 flex flex-wrap gap-3 lg:mt-0">
            <Link
              to="/precos"
              className="inline-flex items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              Saiba mais
            </Link>
            <a
              href="mailto:contato@pyrou.com.br?subject=PDV%20Cashless%20-%20Contato"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
            >
              Entre em contato
            </a>
          </div>
        </aside>

        <div className="flex items-center justify-center px-4 py-10 lg:px-8">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-amber-400">Entrar</h2>
            <p className="mb-6 mt-1 text-slate-400">
              Acesse o painel do seu estabelecimento
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <label className="mb-1 block text-sm text-slate-300">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              placeholder="seu@email.com"
              className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <label className="mb-1 block text-sm text-slate-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="mb-6 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to="/precos"
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300"
              >
                Saiba mais
              </Link>
              <a
                href="mailto:contato@pyrou.com.br?subject=PDV%20Cashless%20-%20Contato"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
              >
                Entre em contato
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
