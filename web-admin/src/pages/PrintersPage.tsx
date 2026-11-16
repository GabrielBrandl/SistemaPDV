import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, Trash2, Zap } from 'lucide-react';
import api from '../services/api';

type Station = 'BAR' | 'COZINHA' | 'CAIXA';

type PrinterRow = {
  id: string;
  nome: string;
  station: Station;
  host: string;
  port: number;
  ativo: boolean;
  protocol: string;
};

const STATIONS: Station[] = ['BAR', 'COZINHA', 'CAIXA'];

export function PrintersPage() {
  const qc = useQueryClient();
  const [nome, setNome] = useState('');
  const [station, setStation] = useState<Station>('BAR');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(9100);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ['printers'],
    queryFn: async () => {
      const { data } = await api.get<PrinterRow[]>('/printers');
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/printers', {
        nome,
        station,
        host,
        port,
        ativo: true,
        protocol: 'escpos_tcp',
      });
      return data;
    },
    onSuccess: () => {
      setNome('');
      setHost('');
      setPort(9100);
      setMsg('Impressora cadastrada');
      setErr(null);
      qc.invalidateQueries({ queryKey: ['printers'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setErr(e.response?.data?.message || 'Falha ao cadastrar');
      setMsg(null);
    },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/printers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['printers'] }),
  });

  const testMut = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/printers/${id}/test`);
      return data;
    },
    onSuccess: (data: { printer?: string }) => {
      setMsg(`Teste enviado: ${data.printer || 'ok'}`);
      setErr(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setErr(e.response?.data?.message || 'Falha no teste (rede/IP?)');
      setMsg(null);
    },
  });

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold">Impressoras</h2>
      <p className="mb-6 text-sm text-slate-400">
        Conecte impressoras ESC/POS de rede (porta 9100) para bar, cozinha e caixa.
        Ao pagar um pedido, o sistema envia tickets automaticamente.
      </p>

      {msg && (
        <p className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {msg}
        </p>
      )}
      {err && (
        <p className="mb-4 rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {err}
        </p>
      )}

      <form
        className="mb-8 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
      >
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-slate-400">Nome</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Impressora Bar 1"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Estação</span>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={station}
            onChange={(e) => setStation(e.target.value as Station)}
          >
            {STATIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">IP / host</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="192.168.1.50"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Porta</span>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            value={port}
            onChange={(e) => setPort(Number(e.target.value) || 9100)}
            min={1}
            max={65535}
          />
        </label>
        <button
          type="submit"
          disabled={createMut.isPending}
          className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500 md:col-span-5 md:w-fit"
        >
          {createMut.isPending ? 'Salvando…' : 'Adicionar impressora'}
        </button>
      </form>

      {isLoading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : printers.length === 0 ? (
        <p className="text-slate-500">Nenhuma impressora cadastrada neste tenant.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {printers.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-sky-400" />
                  <h3 className="font-semibold">{p.nome}</h3>
                </div>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {p.station}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {p.host}:{p.port}
              </p>
              <p className="text-xs text-slate-500">
                {p.ativo ? 'Ativa' : 'Inativa'} · {p.protocol}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => testMut.mutate(p.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Testar
                </button>
                <button
                  type="button"
                  onClick={() => removeMut.mutate(p.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-900/50 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
