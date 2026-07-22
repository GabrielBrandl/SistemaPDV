import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  DoorOpen,
  Store,
  Users,
} from 'lucide-react';
import api from '../services/api';

export function AdminControlPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => (await api.get('/admin/overview')).data,
    refetchInterval: 10000,
  });

  const { data: comandas } = useQuery({
    queryKey: ['admin-comandas'],
    queryFn: async () => (await api.get('/admin/comandas')).data,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <p className="text-slate-400">Carregando painel admin...</p>;
  }

  const kpis = data?.kpis || {};

  const cards = [
    { label: 'Comandas abertas', value: kpis.comandas_abertas, icon: Store },
    {
      label: 'Aguardando pagamento',
      value: kpis.aguardando_pagamento,
      icon: AlertTriangle,
      warn: true,
    },
    {
      label: 'Faturamento (pagas)',
      value: `R$ ${Number(kpis.faturamento || 0).toFixed(2)}`,
      icon: CheckCircle2,
    },
    {
      label: 'Pendência na saída',
      value: `R$ ${Number(kpis.pendencia_saida || 0).toFixed(2)}`,
      icon: DoorOpen,
      warn: true,
    },
    { label: 'Cartões ativos', value: kpis.cartoes_ativos, icon: CreditCard },
    { label: 'Liberados hoje', value: kpis.liberacoes_hoje, icon: Users },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Painel Admin · Controle Total</h2>
          <p className="text-slate-400 text-sm mt-1">
            Visão geral do evento: consumo no bar, pagamento na saída e liberação
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/pos"
            className="rounded-lg bg-amber-500 text-slate-900 px-4 py-2 text-sm font-semibold"
          >
            Abrir PDV
          </Link>
          <Link
            to="/saida"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm"
          >
            Controle de Saída
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 mb-6 text-sm text-slate-300">
        <p className="font-semibold text-amber-300 mb-2">Fluxo do evento</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-400">
          <li>{data?.fluxo?.consumo}</li>
          <li>{data?.fluxo?.pagamento}</li>
          <li>{data?.fluxo?.saida}</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border p-5 ${
              c.warn
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-slate-800 bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">{c.label}</p>
              <c.icon size={18} className="text-amber-400" />
            </div>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 font-semibold">Pendências para sair</div>
          <div className="divide-y divide-slate-800">
            {(data?.pendencias_saida || []).length === 0 && (
              <p className="p-4 text-slate-500 text-sm">Nenhuma pendência</p>
            )}
            {(data?.pendencias_saida || []).map(
              (p: {
                card_uid: string;
                cliente_nome: string | null;
                pendencia: number;
                comandas: number;
              }) => (
                <div key={p.card_uid} className="px-4 py-3 text-sm flex justify-between">
                  <div>
                    <p className="font-mono text-xs text-slate-400">{p.card_uid}</p>
                    <p>{p.cliente_nome || 'Cliente'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-300 font-bold">
                      R$ {Number(p.pendencia).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">{p.comandas} comanda(s)</p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 font-semibold">Equipe do tenant</div>
          <div className="divide-y divide-slate-800">
            {(data?.usuarios || []).map(
              (u: { id: string; name: string; email: string; role: string }) => (
                <div key={u.id} className="px-4 py-3 text-sm flex justify-between">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                  <span className="text-xs rounded bg-slate-800 px-2 py-1 h-fit">{u.role}</span>
                </div>
              ),
            )}
          </div>
          <div className="p-3 text-xs text-slate-500 border-t border-slate-800">
            Admin: controle total · Operador: PDV/bar · Saída: liberação na porta
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-800 px-4 py-3 font-semibold">Comandas recentes</div>
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="text-left p-3">Nº</th>
              <th className="text-left p-3">Cartão</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Total</th>
              <th className="text-right p-3">Restante</th>
            </tr>
          </thead>
          <tbody>
            {(comandas || []).map(
              (c: {
                id: string;
                numero: number;
                card_uid: string;
                status: string;
                total: number;
                restante: number;
              }) => (
                <tr key={c.id} className="border-t border-slate-800">
                  <td className="p-3">#{c.numero}</td>
                  <td className="p-3 font-mono text-xs">{c.card_uid}</td>
                  <td className="p-3">{c.status}</td>
                  <td className="p-3 text-right">R$ {Number(c.total).toFixed(2)}</td>
                  <td className="p-3 text-right text-amber-300">
                    R$ {Number(c.restante).toFixed(2)}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="font-semibold mb-2">Liberados hoje</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {(data?.liberacoes_hoje || []).length === 0 && (
            <p className="text-slate-500">Nenhuma liberação registrada</p>
          )}
          {(data?.liberacoes_hoje || []).map(
            (e: {
              id: string;
              card_uid: string;
              cliente_nome: string | null;
              status: string;
              liberado_em: string;
              total_consumido: number;
            }) => (
              <div key={e.id} className="rounded-lg bg-slate-800 px-3 py-2">
                <p className="font-mono text-xs">{e.card_uid}</p>
                <p>{e.cliente_nome || 'Cliente'}</p>
                <p className="text-xs text-slate-400">
                  {new Date(e.liberado_em).toLocaleString('pt-BR')} · {e.status} · R${' '}
                  {Number(e.total_consumido).toFixed(2)}
                </p>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
