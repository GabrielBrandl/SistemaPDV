import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export function OnboardPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: '',
    slug: '',
    cnpj: '',
    razao_social: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/tenants/onboard', {
        ...form,
        slug: form.slug || undefined,
        cnpj: form.cnpj || undefined,
        razao_social: form.razao_social || undefined,
      });
      navigate('/login');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response
          ?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message || 'Falha ao criar estabelecimento',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Onboarding SaaS</h1>
          <p className="text-slate-400 text-sm mt-1">
            Crie seu estabelecimento e o usuário administrador
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Nome do bar/evento"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <input
            placeholder="Slug (opcional)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <input
            placeholder="CNPJ"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <input
            placeholder="Razão social"
            value={form.razao_social}
            onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <input
            placeholder="Nome do admin"
            value={form.admin_name}
            onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <input
            type="email"
            placeholder="E-mail do admin"
            value={form.admin_email}
            onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
        </div>
        <input
          type="password"
          placeholder="Senha do admin (mín. 6)"
          value={form.admin_password}
          onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
          required
          minLength={6}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-2.5 disabled:opacity-50"
        >
          {loading ? 'Criando...' : 'Criar estabelecimento'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-amber-400">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
