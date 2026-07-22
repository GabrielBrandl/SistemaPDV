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
        navigate('/tenants');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl"
      >
        <h1 className="text-2xl font-bold text-amber-400">PDV Cashless SaaS</h1>
        <p className="text-slate-400 mt-1 mb-6">Acesse o painel do seu estabelecimento</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}

        <label className="block text-sm text-slate-300 mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        <label className="block text-sm text-slate-300 mb-1">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-2.5 transition disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-slate-500 text-xs mt-4 text-center space-y-1">
          <span className="block">Admin: admin@pdv.local / admin123</span>
          <span className="block">Saída: saida@pdv.local / saida123</span>
          <span className="block">Bar: operador@pdv.local / operador123</span>
        </p>
        <p className="text-center text-sm text-slate-500 mt-3">
          Novo estabelecimento?{' '}
          <Link to="/onboard" className="text-amber-400 hover:text-amber-300">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}
