import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LogIn } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth';
import {
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  apiErrorMessage,
  formatBrl,
  formatDate,
  formatDateTime,
  invoiceBadgeClass,
  statusBadgeClass,
} from '../lib/saas-ui';
import type {
  CompanyDetail,
  TenantPlanId,
  TenantStatusId,
} from '../types/saas';

export function CompanyDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setImpersonateTenantId = useAuthStore((s) => s.setImpersonateTenantId);
  const setEventId = useAuthStore((s) => s.setEventId);

  const [plano, setPlano] = useState<TenantPlanId>('starter');
  const [status, setStatus] = useState<TenantStatusId>('trial');
  const [statusNotas, setStatusNotas] = useState('');
  const [contact, setContact] = useState({
    email_contato: '',
    telefone: '',
    cidade: '',
    uf: '',
    notas_internas: '',
  });
  const [invoiceValor, setInvoiceValor] = useState('');
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-company', id],
    queryFn: async () =>
      (await api.get(`/platform/companies/${id}`)).data as CompanyDetail,
    enabled: !!id,
  });

  useEffect(() => {
    if (!data) return;
    setPlano(data.tenant.plano);
    setStatus(data.tenant.status);
    setContact({
      email_contato: data.tenant.emailContato ?? '',
      telefone: data.tenant.telefone ?? '',
      cidade: data.tenant.cidade ?? '',
      uf: data.tenant.uf ?? '',
      notas_internas: data.tenant.notasInternas ?? '',
    });
    setInvoiceValor(String(data.tenant.valorMensal ?? ''));
  }, [data]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['platform-company', id] });
    queryClient.invalidateQueries({ queryKey: ['platform-companies'] });
    queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
  }

  const planMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/platform/companies/${id}/plan`, { plano })).data,
    onSuccess: () => {
      setMsg('Plano atualizado');
      setErr('');
      invalidate();
    },
    onError: (e) => setErr(apiErrorMessage(e, 'Falha ao alterar plano')),
  });

  const statusMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/platform/companies/${id}/status`, {
          status,
          notas: statusNotas || undefined,
        })
      ).data,
    onSuccess: () => {
      setMsg('Status atualizado');
      setStatusNotas('');
      setErr('');
      invalidate();
    },
    onError: (e) => setErr(apiErrorMessage(e, 'Falha ao alterar status')),
  });

  const contactMutation = useMutation({
    mutationFn: async () =>
      (await api.patch(`/platform/companies/${id}`, contact)).data,
    onSuccess: () => {
      setMsg('Contato atualizado');
      setErr('');
      invalidate();
    },
    onError: (e) => setErr(apiErrorMessage(e, 'Falha ao salvar contato')),
  });

  const invoiceMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/platform/companies/${id}/invoices`, {
          valor: invoiceValor ? Number(invoiceValor) : undefined,
          descricao: invoiceDesc || undefined,
        })
      ).data,
    onSuccess: () => {
      setMsg('Fatura criada');
      setInvoiceDesc('');
      setErr('');
      invalidate();
    },
    onError: (e) => setErr(apiErrorMessage(e, 'Falha ao criar fatura')),
  });

  const payMutation = useMutation({
    mutationFn: async (invoiceId: string) =>
      (await api.post(`/platform/invoices/${invoiceId}/pay`)).data,
    onSuccess: () => {
      setMsg('Fatura marcada como paga');
      setErr('');
      invalidate();
    },
    onError: (e) => setErr(apiErrorMessage(e, 'Falha ao pagar fatura')),
  });

  async function enterTenant() {
    if (!id) return;
    setImpersonateTenantId(id);
    const events = await api.get('/events');
    if (Array.isArray(events.data) && events.data.length > 0) {
      setEventId(events.data[0].id as string);
    } else {
      setEventId('');
    }
    navigate('/admin');
  }

  if (isLoading) {
    return <p className="text-slate-400">Carregando empresa...</p>;
  }

  if (error || !data) {
    return (
      <p className="text-red-300">
        {apiErrorMessage(error, 'Empresa não encontrada')}
      </p>
    );
  }

  const { tenant, plan_def: planDef } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/platform/empresas"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-amber-300"
          >
            <ArrowLeft size={14} /> Empresas
          </Link>
          <h2 className="text-2xl font-bold text-slate-100">{tenant.nome}</h2>
          <p className="mt-1 font-mono text-xs text-slate-500">{tenant.slug}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusBadgeClass(tenant.status)}`}
            >
              {tenant.status}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {planDef.nome}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={enterTenant}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
        >
          <LogIn size={16} />
          Entrar no tenant
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Valor mensal', value: formatBrl(tenant.valorMensal) },
          { label: 'GMV pagamentos', value: formatBrl(data.gmv_pagamentos) },
          {
            label: 'Métricas',
            value: `${data.users.filter((u) => u.ativo).length}u · ${data.events.length}e · ${data.terminals.length}t`,
          },
          { label: 'Cartões', value: String(data.cards) },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 text-lg font-semibold text-amber-400">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-3 font-semibold">Informações</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Info label="CNPJ" value={tenant.cnpj || '—'} />
            <Info label="Razão social" value={tenant.razaoSocial || '—'} />
            <Info label="Cidade/UF" value={`${tenant.cidade || '—'} / ${tenant.uf || '—'}`} />
            <Info label="Trial até" value={formatDate(tenant.trialAte)} />
            <Info label="Próx. cobrança" value={formatDate(tenant.proximaCobranca)} />
            <Info label="Ciclo" value={tenant.cicloCobranca} />
            <Info
              label="Limites"
              value={`${tenant.maxUsuarios}u / ${tenant.maxEventos}e / ${tenant.maxTerminais}t`}
            />
            <Info label="Criado em" value={formatDate(tenant.criadoEm)} />
          </dl>
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-500">Plano atual</p>
            <p className="font-medium text-slate-200">{planDef.nome}</p>
            <p className="mt-1 text-xs text-slate-400">{planDef.descricao}</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-3 font-semibold">Alterar plano</h3>
            <div className="flex flex-wrap gap-2">
              <select
                value={plano}
                onChange={(e) => setPlano(e.target.value as TenantPlanId)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                {PLAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => planMutation.mutate()}
                disabled={planMutation.isPending}
                className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
              >
                Salvar plano
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-3 font-semibold">Alterar status</h3>
            <div className="space-y-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TenantStatusId)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                placeholder="Notas (opcional)"
                value={statusNotas}
                onChange={(e) => setStatusNotas(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Atualizar status
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 font-semibold">Contato / notas</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            placeholder="E-mail contato"
            value={contact.email_contato}
            onChange={(e) =>
              setContact({ ...contact, email_contato: e.target.value })
            }
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            placeholder="Telefone"
            value={contact.telefone}
            onChange={(e) =>
              setContact({ ...contact, telefone: e.target.value })
            }
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            placeholder="Cidade"
            value={contact.cidade}
            onChange={(e) => setContact({ ...contact, cidade: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            placeholder="UF"
            value={contact.uf}
            onChange={(e) => setContact({ ...contact, uf: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Notas internas"
            value={contact.notas_internas}
            onChange={(e) =>
              setContact({ ...contact, notas_internas: e.target.value })
            }
            rows={3}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={() => contactMutation.mutate()}
          disabled={contactMutation.isPending}
          className="mt-3 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          Salvar contato
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 font-semibold">Usuários</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2 text-left">Nome</th>
                <th className="pb-2 text-left">E-mail</th>
                <th className="pb-2 text-left">Papel</th>
                <th className="pb-2 text-center">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2 text-slate-400">{u.email}</td>
                  <td className="py-2 capitalize">{u.role}</td>
                  <td className="py-2 text-center">
                    {u.ativo ? (
                      <span className="text-emerald-400">sim</span>
                    ) : (
                      <span className="text-slate-500">não</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.users.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    Sem usuários
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="font-semibold">Faturas</h3>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Valor"
              value={invoiceValor}
              onChange={(e) => setInvoiceValor(e.target.value)}
              className="w-28 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <input
              placeholder="Descrição"
              value={invoiceDesc}
              onChange={(e) => setInvoiceDesc(e.target.value)}
              className="min-w-[10rem] flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => invoiceMutation.mutate()}
              disabled={invoiceMutation.isPending}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              Criar fatura
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2 text-left">Descrição</th>
                <th className="pb-2 text-right">Valor</th>
                <th className="pb-2 text-center">Status</th>
                <th className="pb-2 text-left">Período</th>
                <th className="pb-2 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-800">
                  <td className="py-2">{inv.descricao || '—'}</td>
                  <td className="py-2 text-right text-amber-300">
                    {formatBrl(inv.valor)}
                  </td>
                  <td className="py-2 text-center">
                    <span
                      className={`rounded px-2 py-0.5 text-xs capitalize ${invoiceBadgeClass(inv.status)}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-slate-400">
                    {formatDate(inv.periodoInicio)} — {formatDate(inv.periodoFim)}
                  </td>
                  <td className="py-2 text-center">
                    {inv.status === 'pending' || inv.status === 'overdue' ? (
                      <button
                        type="button"
                        onClick={() => payMutation.mutate(inv.id)}
                        disabled={payMutation.isPending}
                        className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                      >
                        Marcar paga
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    Sem faturas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="mb-3 font-semibold">Audit log</h3>
        <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
          {data.audit.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-slate-200">{a.acao}</span>
                <span className="text-xs text-slate-500">
                  {formatDateTime(a.criadoEm)}
                </span>
              </div>
              {a.detalhe && (
                <pre className="mt-1 overflow-x-auto text-xs text-slate-500">
                  {a.detalhe}
                </pre>
              )}
            </li>
          ))}
          {data.audit.length === 0 && (
            <li className="py-4 text-center text-slate-500">Sem eventos</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}
