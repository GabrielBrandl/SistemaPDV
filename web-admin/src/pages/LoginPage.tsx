import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
  const [email, setEmail] = useState('admin@pdv.local');
  const [password, setPassword] = useState('admin123');
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
              planos Free, Starter, Pro e Enterprise.
            </p>
          </div>
          <div className="relative mt-10 space-y-3 text-sm text-slate-400 lg:mt-0">
            <p>
              Conheça os{' '}
              <Link to="/precos" className="text-amber-400 hover:text-amber-300">
                planos e preços
              </Link>
            </p>
            <p>
              Novo estabelecimento?{' '}
              <Link
                to="/onboard"
                className="text-amber-400 hover:text-amber-300"
              >
                Criar conta
              </Link>
            </p>
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
              className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <label className="mb-1 block text-sm text-slate-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="mt-4 space-y-1 text-center text-xs text-slate-500">
              <span className="block">Admin: admin@pdv.local / admin123</span>
              <span className="block">
                Plataforma: super@pdv.local / super123
              </span>
              <span className="block">Saída: saida@pdv.local / saida123</span>
              <span className="block">
                Bar: operador@pdv.local / operador123
              </span>
            </p>
            <p className="mt-3 text-center text-sm text-slate-500">
              Novo estabelecimento?{' '}
              <Link to="/onboard" className="text-amber-400 hover:text-amber-300">
                Criar conta
              </Link>
              {' · '}
              <Link to="/precos" className="text-amber-400 hover:text-amber-300">
                Preços
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
