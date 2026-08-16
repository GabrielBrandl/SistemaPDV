import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { apiErrorMessage, formatBrl } from '../lib/saas-ui';
import type { PlanDefinition, TenantPlanId } from '../types/saas';

export function OnboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);
  const [plano, setPlano] = useState<TenantPlanId>('pro');
  const [form, setForm] = useState({
    nome: '',
    slug: '',
    cnpj: '',
    razao_social: '',
    telefone: '',
    cidade: '',
    uf: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => (await api.get('/plans')).data as PlanDefinition[],
  });

  useEffect(() => {
    const fromQuery = searchParams.get('plano') as TenantPlanId | null;
    if (
      fromQuery &&
      ['free', 'starter', 'pro', 'enterprise'].includes(fromQuery)
    ) {
      setPlano(fromQuery);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/tenants/onboard', {
        ...form,
        plano,
        slug: form.slug || undefined,
        cnpj: form.cnpj || undefined,
        razao_social: form.razao_social || undefined,
        telefone: form.telefone || undefined,
        cidade: form.cidade || undefined,
        uf: form.uf || undefined,
      });
      navigate('/login');
    } catch (err) {
      setError(apiErrorMessage(err, 'Falha ao criar estabelecimento'));
    } finally {
      setLoading(false);
    }
  }

  const selected = plans?.find((p) => p.id === plano);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/80">
            PDV Cashless
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-50 md:text-4xl">
            Operação cashless pronta em minutos
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Comandas NFC, PDV, controle de saída e fechamento — no estilo Zig,
            para bares, casas e festivais. Escolha o plano e configure seu
            estabelecimento.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2 text-sm">
          <StepPill active={step === 1} done={step > 1} n={1} label="Plano" />
          <div className="h-px w-8 bg-slate-700" />
          <StepPill active={step === 2} done={false} n={2} label="Conta" />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {(plans ?? []).map((p) => {
                const active = p.id === plano;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlano(p.id)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      active
                        ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-600'
                    } ${p.destaque ? 'md:col-span-2 md:mx-auto md:max-w-xl' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold text-amber-300">
                            {p.nome}
                          </h2>
                          {p.destaque && (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900">
                              Recomendado
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          {p.descricao}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-100">
                          {p.preco_mensal === 0
                            ? 'Grátis'
                            : formatBrl(p.preco_mensal)}
                        </p>
                        {p.preco_mensal > 0 && (
                          <p className="text-xs text-slate-500">/mês</p>
                        )}
                      </div>
                    </div>
                    <ul className="mt-4 space-y-1.5">
                      {p.recursos.slice(0, 4).map((r) => (
                        <li
                          key={r}
                          className="flex items-start gap-2 text-xs text-slate-300"
                        >
                          <Check
                            size={14}
                            className="mt-0.5 shrink-0 text-amber-400"
                          />
                          {r}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">
                      Trial de {p.trial_dias} dias
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-slate-900 hover:bg-amber-400"
              >
                Continuar
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:p-8"
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-amber-300"
            >
              <ChevronLeft size={16} /> Voltar aos planos
            </button>

            {selected && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                Plano selecionado: <strong>{selected.nome}</strong> · trial{' '}
                {selected.trial_dias} dias
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <h2 className="mb-1 text-lg font-semibold text-slate-100">
              Estabelecimento
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              Dados da casa e do administrador inicial
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                onChange={(e) =>
                  setForm({ ...form, razao_social: e.target.value })
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
              />
              <input
                placeholder="Telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="Cidade"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="col-span-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
                />
                <input
                  placeholder="UF"
                  value={form.uf}
                  onChange={(e) => setForm({ ...form, uf: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
                />
              </div>
              <input
                placeholder="Nome do admin"
                value={form.admin_name}
                onChange={(e) =>
                  setForm({ ...form, admin_name: e.target.value })
                }
                required
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
              />
              <input
                type="email"
                placeholder="E-mail do admin"
                value={form.admin_email}
                onChange={(e) =>
                  setForm({ ...form, admin_email: e.target.value })
                }
                required
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
              />
            </div>
            <input
              type="password"
              placeholder="Senha do admin (mín. 6)"
              value={form.admin_password}
              onChange={(e) =>
                setForm({ ...form, admin_password: e.target.value })
              }
              required
              minLength={6}
              className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar conta e começar trial'}
            </button>

            <p className="mt-4 text-center text-sm text-slate-500">
              Já tem conta?{' '}
              <Link to="/login" className="text-amber-400">
                Entrar
              </Link>
              {' · '}
              <Link to="/precos" className="text-amber-400">
                Ver preços
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function StepPill({
  active,
  done,
  n,
  label,
}: {
  active: boolean;
  done: boolean;
  n: number;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1 ${
        active
          ? 'bg-amber-500/20 text-amber-300'
          : done
            ? 'bg-slate-800 text-slate-300'
            : 'bg-slate-900 text-slate-500'
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-xs font-bold">
        {n}
      </span>
      {label}
    </div>
  );
}
