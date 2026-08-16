import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, LogIn, Plus, Search, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth';
import {
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  apiErrorMessage,
  formatBrl,
  formatDate,
  statusBadgeClass,
} from '../lib/saas-ui';
import type {
  CompanyListItem,
  PlanDefinition,
  TenantPlanId,
} from '../types/saas';

const emptyForm = {
  nome: '',
  cnpj: '',
  razao_social: '',
  plano: 'starter' as TenantPlanId,
  telefone: '',
  cidade: '',
  uf: '',
  admin_name: '',
  admin_email: '',
  admin_password: '',
  notas_internas: '',
};

export function TenantsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setImpersonateTenantId = useAuthStore((s) => s.setImpersonateTenantId);
  const setEventId = useAuthStore((s) => s.setEventId);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [plano, setPlano] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (searchParams.get('nova') === '1') {
      setDrawerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('nova');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => (await api.get('/plans')).data as PlanDefinition[],
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ['platform-companies', q, status, plano],
    queryFn: async () =>
      (
        await api.get('/platform/companies', {
          params: {
            q: q || undefined,
            status: status || undefined,
            plano: plano || undefined,
          },
        })
      ).data as CompanyListItem[],
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/platform/companies', {
          ...form,
          cnpj: form.cnpj || undefined,
          razao_social: form.razao_social || undefined,
          telefone: form.telefone || undefined,
          cidade: form.cidade || undefined,
          uf: form.uf || undefined,
          notas_internas: form.notas_internas || undefined,
        })
      ).data,
    onSuccess: () => {
      setForm(emptyForm);
      setFormError('');
      setDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['platform-companies'] });
      queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err, 'Falha ao cadastrar empresa'));
    },
  });

  async function enterTenant(company: CompanyListItem) {
    setImpersonateTenantId(company.id);
    const events = await api.get('/events');
    if (Array.isArray(events.data) && events.data.length > 0) {
      setEventId(events.data[0].id as string);
    } else {
      setEventId('');
    }
    navigate('/admin');
  }

  function onSubmitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Empresas</h2>
          <p className="mt-1 text-sm text-slate-400">
            CRM de tenants — busca, filtros e provisionamento
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
        >
          <Plus size={16} />
          Cadastrar empresa
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-end">
        <label className="min-w-0 flex-1 text-sm text-slate-300">
          Busca
          <div className="relative mt-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, slug, CNPJ..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </label>
        <label className="text-sm text-slate-300 md:w-40">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300 md:w-40">
          Plano
          <select
            value={plano}
            onChange={(e) => setPlano(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {isLoading && <p className="text-slate-500">Carregando...</p>}
        {!isLoading && companies?.length === 0 && (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-500">
            Nenhuma empresa encontrada
          </p>
        )}
        {companies?.map((c) => (
          <article
            key={c.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-100">
                  {c.nome}
                </h3>
                <p className="font-mono text-xs text-slate-500">{c.slug}</p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize ${statusBadgeClass(c.status)}`}
              >
                {c.status}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {c.plan_def?.nome ?? c.plano} · {formatBrl(c.valorMensal)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {c.metrics.usuarios}u / {c.metrics.eventos}e /{' '}
              {c.metrics.terminais}t · trial {formatDate(c.trialAte)}
            </p>
            <div className="mt-3 flex gap-3">
              <Link
                to={`/platform/empresas/${c.id}`}
                className="text-sm text-amber-400"
              >
                Ver detalhes
              </Link>
              <button
                type="button"
                onClick={() => enterTenant(c)}
                className="text-sm text-sky-400"
              >
                Entrar no tenant
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-800 md:block">
        {isLoading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Slug</th>
                  <th className="p-3 text-left">Plano</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Métricas</th>
                  <th className="p-3 text-right">Mensal</th>
                  <th className="p-3 text-left">Trial até</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {companies?.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="p-3 font-medium text-slate-100">{c.nome}</td>
                    <td className="p-3 font-mono text-xs text-slate-400">
                      {c.slug}
                    </td>
                    <td className="p-3 capitalize text-slate-300">
                      {c.plan_def?.nome ?? c.plano}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs capitalize ${statusBadgeClass(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-xs text-slate-400">
                      {c.metrics.usuarios}u / {c.metrics.eventos}e /{' '}
                      {c.metrics.terminais}t
                    </td>
                    <td className="p-3 text-right text-amber-300">
                      {formatBrl(c.valorMensal)}
                    </td>
                    <td className="p-3 text-slate-400">
                      {formatDate(c.trialAte)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/platform/empresas/${c.id}`}
                          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-amber-300"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => enterTenant(c)}
                          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-sky-300"
                          title="Entrar no tenant"
                        >
                          <LogIn size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {companies?.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-slate-500"
                    >
                      Nenhuma empresa encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fechar"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h3 className="font-semibold text-amber-400">Cadastrar empresa</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={onSubmitCreate}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="space-y-3 overflow-y-auto p-4">
                {formError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {formError}
                  </div>
                )}
                <Field
                  label="Nome"
                  value={form.nome}
                  onChange={(v) => setForm({ ...form, nome: v })}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="CNPJ"
                    value={form.cnpj}
                    onChange={(v) => setForm({ ...form, cnpj: v })}
                  />
                  <label className="text-sm text-slate-300">
                    Plano
                    <select
                      value={form.plano}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          plano: e.target.value as TenantPlanId,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                    >
                      {(plans ?? PLAN_OPTIONS).map((p) => (
                        <option
                          key={'id' in p ? p.id : p.value}
                          value={'id' in p ? p.id : p.value}
                        >
                          {'nome' in p ? p.nome : p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Field
                  label="Razão social"
                  value={form.razao_social}
                  onChange={(v) => setForm({ ...form, razao_social: v })}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Field
                    label="Telefone"
                    value={form.telefone}
                    onChange={(v) => setForm({ ...form, telefone: v })}
                    className="col-span-2"
                  />
                  <Field
                    label="UF"
                    value={form.uf}
                    onChange={(v) => setForm({ ...form, uf: v })}
                  />
                </div>
                <Field
                  label="Cidade"
                  value={form.cidade}
                  onChange={(v) => setForm({ ...form, cidade: v })}
                />
                <div className="border-t border-slate-800 pt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Admin inicial
                  </p>
                  <div className="space-y-3">
                    <Field
                      label="Nome"
                      value={form.admin_name}
                      onChange={(v) => setForm({ ...form, admin_name: v })}
                      required
                    />
                    <Field
                      label="E-mail"
                      type="email"
                      value={form.admin_email}
                      onChange={(v) => setForm({ ...form, admin_email: v })}
                      required
                    />
                    <Field
                      label="Senha"
                      type="password"
                      value={form.admin_password}
                      onChange={(v) => setForm({ ...form, admin_password: v })}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <label className="block text-sm text-slate-300">
                  Notas internas
                  <textarea
                    value={form.notas_internas}
                    onChange={(e) =>
                      setForm({ ...form, notas_internas: e.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
                  />
                </label>
              </div>
              <div className="border-t border-slate-800 p-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Salvando...' : 'Provisionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  minLength,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}) {
  return (
    <label className={`block text-sm text-slate-300 ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2"
      />
    </label>
  );
}
