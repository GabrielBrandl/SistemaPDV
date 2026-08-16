import { useQuery } from '@tanstack/react-query';
import { Check, Crown, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatBrl, formatDate, statusBadgeClass } from '../lib/saas-ui';
import type { PlanDefinition, TenantPlanId, TenantRecord } from '../types/saas';

type MeResponse = {
  tenant: TenantRecord | null;
  role: string;
};

export function BillingPage() {
  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ['tenants-me'],
    queryFn: async () => (await api.get('/tenants/me')).data as MeResponse,
  });

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => (await api.get('/plans')).data as PlanDefinition[],
  });

  if (loadingMe || loadingPlans) {
    return <p className="text-slate-400">Carregando assinatura...</p>;
  }

  const tenant = me?.tenant;
  if (!tenant) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-slate-300">
          Nenhum tenant associado a esta conta.
        </p>
        <Link to="/precos" className="mt-3 inline-block text-amber-400">
          Ver planos
        </Link>
      </div>
    );
  }

  const currentPlan =
    plans?.find((p) => p.id === tenant.plano) ??
    plans?.find((p) => p.id === 'starter');

  const upgrades =
    plans?.filter((p) => planRank(p.id) > planRank(tenant.plano)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Assinatura</h2>
        <p className="mt-1 text-sm text-slate-400">
          Plano atual, limites e opções de upgrade
        </p>
      </div>

      <section className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-900 to-amber-950/30 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-400/80">
              Plano atual
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-2xl font-bold text-amber-300">
              <Crown size={22} />
              {currentPlan?.nome ?? tenant.plano}
            </h3>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              {currentPlan?.descricao}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-100">
              {formatBrl(tenant.valorMensal)}
              <span className="text-sm font-normal text-slate-500">/mês</span>
            </p>
            <span
              className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${statusBadgeClass(tenant.status)}`}
            >
              {tenant.status}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <LimitCard
            label="Usuários"
            max={tenant.maxUsuarios}
          />
          <LimitCard label="Eventos" max={tenant.maxEventos} />
          <LimitCard label="Terminais" max={tenant.maxTerminais} />
        </div>

        <dl className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
          <div>
            Trial até: <span className="text-slate-200">{formatDate(tenant.trialAte)}</span>
          </div>
          <div>
            Próxima cobrança:{' '}
            <span className="text-slate-200">
              {formatDate(tenant.proximaCobranca)}
            </span>
          </div>
        </dl>
      </section>

      {currentPlan && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-3 font-semibold">Recursos inclusos</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {currentPlan.recursos.map((r) => (
              <li
                key={r}
                className="flex items-start gap-2 text-sm text-slate-300"
              >
                <Check size={16} className="mt-0.5 shrink-0 text-amber-400" />
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {upgrades.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold text-slate-100">Upgrade</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upgrades.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border p-5 ${
                  p.destaque
                    ? 'border-amber-500/50 bg-slate-900'
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h4 className="text-lg font-semibold text-amber-300">
                    {p.nome}
                  </h4>
                  <p className="text-sm text-slate-300">
                    {formatBrl(p.preco_mensal)}
                    <span className="text-slate-500">/mês</span>
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-400">{p.descricao}</p>
                <a
                  href={`mailto:comercial@pdv.local?subject=Upgrade%20para%20${encodeURIComponent(p.nome)}&body=Olá,%20gostaria%20de%20fazer%20upgrade%20do%20tenant%20${encodeURIComponent(tenant.nome)}%20para%20${encodeURIComponent(p.nome)}.`}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                >
                  <Mail size={14} />
                  Falar com comercial
                </a>
                <Link
                  to={`/precos`}
                  className="mt-2 block text-xs text-slate-500 hover:text-amber-400"
                >
                  Comparar planos
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LimitCard({ label, max }: { label: string; max: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200">
        Limite: <span className="font-semibold text-amber-300">{max}</span>
      </p>
    </div>
  );
}

function planRank(id: TenantPlanId | string): number {
  const order: Record<string, number> = {
    starter: 1,
    pro: 2,
    enterprise: 3,
  };
  return order[id] ?? 0;
}
