import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Clock,
  CreditCard,
  PauseCircle,
  Plus,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  apiErrorMessage,
  formatBrl,
  formatDate,
  statusBadgeClass,
} from '../lib/saas-ui';
import type { PlatformOverview } from '../types/saas';

export function PlatformDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-overview'],
    queryFn: async () =>
      (await api.get('/platform/overview')).data as PlatformOverview,
  });

  const expireMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/platform/jobs/expire-trials')).data as {
        suspended: number;
      },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
      queryClient.invalidateQueries({ queryKey: ['platform-companies'] });
    },
  });

  if (isLoading) {
    return <p className="text-slate-400">Carregando visão da plataforma...</p>;
  }

  if (error || !data) {
    return (
      <p className="text-red-300">
        {apiErrorMessage(error, 'Não foi possível carregar o overview.')}
      </p>
    );
  }

  const kpis = [
    {
      label: 'Empresas',
      value: String(data.empresas),
      icon: Building2,
    },
    {
      label: 'MRR',
      value: formatBrl(data.mrr),
      icon: TrendingUp,
    },
    {
      label: 'Trial',
      value: String(data.by_status.trial),
      icon: Clock,
    },
    {
      label: 'Ativas',
      value: String(data.by_status.active),
      icon: Building2,
    },
    {
      label: 'Suspensas',
      value: String(data.by_status.suspended),
      icon: PauseCircle,
    },
    {
      label: 'Faturas pendentes',
      value: String(data.faturas_pendentes),
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Plataforma</h2>
          <p className="mt-1 text-sm text-slate-400">
            Hub comercial SaaS — empresas, MRR e saúde da base
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => expireMutation.mutate()}
            disabled={expireMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            {expireMutation.isPending ? 'Expirando...' : 'Expirar trials'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/platform/empresas?nova=1')}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
          >
            <Plus size={16} />
            Nova empresa
          </button>
        </div>
      </div>

      {expireMutation.isSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          Trials expirados: {expireMutation.data.suspended} empresa(s)
          suspensa(s).
        </div>
      )}
      {expireMutation.isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {apiErrorMessage(expireMutation.error, 'Falha ao expirar trials')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <div className="mb-2 flex items-center justify-between text-slate-500">
              <p className="text-xs uppercase tracking-wide">{label}</p>
              <Icon size={16} />
            </div>
            <p className="text-xl font-bold text-amber-400">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-4 font-semibold text-slate-100">
            Distribuição por plano
          </h3>
          <ul className="space-y-3">
            {data.by_plan.map((p) => {
              const pct =
                data.empresas > 0
                  ? Math.round((p.total / data.empresas) * 100)
                  : 0;
              return (
                <li key={p.plano}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-300">{p.nome}</span>
                    <span className="text-slate-400">
                      {p.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100">Empresas recentes</h3>
            <Link
              to="/platform/empresas"
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Ver todas
            </Link>
          </div>
          <ul className="divide-y divide-slate-800">
            {data.recentes.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/platform/empresas/${t.id}`}
                    className="block truncate font-medium text-slate-100 hover:text-amber-300"
                  >
                    {t.nome}
                  </Link>
                  <p className="truncate text-xs text-slate-500">
                    {t.slug} · {t.plano} · {formatDate(t.criadoEm)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize ${statusBadgeClass(t.status)}`}
                >
                  {t.status}
                </span>
              </li>
            ))}
            {data.recentes.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-500">
                Nenhuma empresa ainda
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
