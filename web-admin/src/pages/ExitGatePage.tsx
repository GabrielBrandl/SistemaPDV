import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LogOut, Nfc, ShieldAlert, XCircle } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

type ExitCheck = {
  decisao: 'liberar' | 'bloquear' | 'ja_liberado';
  pode_liberar: boolean;
  mensagem: string;
  cartao: { uid: string; nome: string | null; status: string };
  resumo: {
    total_consumido: number;
    pendencia: number;
    comandas_pagas: number;
    comandas_abertas: number;
    comandas_aguardando_pagamento: number;
  };
  comandas_pendentes: {
    id: string;
    numero: number;
    status: string;
    total: number;
    restante: number;
    itens: { nome: string; qtd: number; total: number }[];
  }[];
};

export function ExitGatePage() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [uid, setUid] = useState('04A3B2112233');
  const [check, setCheck] = useState<ExitCheck | null>(null);
  const [nfcOn, setNfcOn] = useState(false);
  const [forceNote, setForceNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: today } = useQuery({
    queryKey: ['exit-today'],
    queryFn: async () => (await api.get('/exit/today')).data,
    refetchInterval: 8000,
  });

  const { data: blocked } = useQuery({
    queryKey: ['exit-blocked'],
    queryFn: async () => (await api.get('/exit/blocked')).data,
    refetchInterval: 8000,
  });

  const checkMutation = useMutation({
    mutationFn: async (uidNfc: string) =>
      (await api.post('/exit/check', { uid_nfc: uidNfc })).data as ExitCheck,
    onSuccess: (data) => {
      setCheck(data);
      setError('');
      setSuccess('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha ao verificar cartão');
      setCheck(null);
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (opts?: { forcar?: boolean }) =>
      (
        await api.post('/exit/release', {
          uid_nfc: uid,
          forcar: opts?.forcar,
          observacao: opts?.forcar ? forceNote : undefined,
        })
      ).data,
    onSuccess: (data) => {
      setSuccess(data.mensagem);
      setCheck(null);
      setForceNote('');
      queryClient.invalidateQueries({ queryKey: ['exit-today'] });
      queryClient.invalidateQueries({ queryKey: ['exit-blocked'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Não foi possível liberar');
    },
  });

  const handleCheck = useCallback(() => {
    if (!uid.trim()) return;
    checkMutation.mutate(uid.trim());
  }, [uid, checkMutation]);

  useEffect(() => {
    const NDEFReader = (
      window as unknown as {
        NDEFReader?: new () => {
          scan: () => Promise<void>;
          onreading: ((e: { serialNumber?: string }) => void) | null;
        };
      }
    ).NDEFReader;
    if (!NDEFReader || !nfcOn) return;
    let cancelled = false;
    const reader = new NDEFReader();
    reader.onreading = (event) => {
      if (cancelled) return;
      const serial = (event.serialNumber || '').replace(/:/g, '').toUpperCase();
      if (serial) {
        setUid(serial);
        checkMutation.mutate(serial);
      }
    };
    reader.scan().catch(() => {
      setError('NFC indisponível neste dispositivo');
      setNfcOn(false);
    });
    return () => {
      cancelled = true;
    };
  }, [nfcOn, checkMutation]);

  const decisionColor =
    check?.decisao === 'liberar'
      ? 'border-emerald-500 bg-emerald-500/10'
      : check?.decisao === 'bloquear'
        ? 'border-red-500 bg-red-500/10'
        : 'border-amber-500 bg-amber-500/10';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-amber-400">Controle de Saída</h1>
          <p className="text-xs text-slate-400">{user?.name} · verifique pagamento antes de liberar</p>
        </div>
        <div className="flex gap-2">
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <a
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-amber-300"
            >
              Painel Admin
            </a>
          )}
          <button
            onClick={() => setNfcOn((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              nfcOn ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
            }`}
          >
            <Nfc size={16} />
            {nfcOn ? 'NFC ativo' : 'Ativar NFC'}
          </button>
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-red-300"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
        <section className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <label className="text-sm text-slate-400">Aproxime ou digite o UID do cartão</label>
            <div className="flex gap-2 mt-2">
              <input
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-mono text-lg"
              />
              <button
                onClick={handleCheck}
                disabled={checkMutation.isPending}
                className="rounded-xl bg-amber-500 text-slate-900 px-6 font-bold disabled:opacity-50"
              >
                Verificar
              </button>
            </div>
          </div>

          {(error || success) && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                error
                  ? 'bg-red-500/10 border border-red-500/40 text-red-300'
                  : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300'
              }`}
            >
              {error || success}
            </div>
          )}

          {check && (
            <div className={`rounded-2xl border-2 p-5 ${decisionColor}`}>
              <div className="flex items-start gap-3 mb-4">
                {check.decisao === 'liberar' ? (
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={32} />
                ) : check.decisao === 'bloquear' ? (
                  <XCircle className="text-red-400 shrink-0" size={32} />
                ) : (
                  <ShieldAlert className="text-amber-400 shrink-0" size={32} />
                )}
                <div>
                  <p className="text-2xl font-bold uppercase tracking-wide">
                    {check.decisao === 'liberar'
                      ? 'LIBERAR SAÍDA'
                      : check.decisao === 'bloquear'
                        ? 'BLOQUEADO'
                        : 'JÁ LIBERADO'}
                  </p>
                  <p className="text-sm mt-1 opacity-90">{check.mensagem}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-slate-400 text-xs">Cliente</p>
                  <p className="font-semibold">{check.cartao.nome || '—'}</p>
                  <p className="font-mono text-xs mt-1">{check.cartao.uid}</p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-slate-400 text-xs">Pendência</p>
                  <p className="text-2xl font-bold">
                    R$ {Number(check.resumo.pendencia).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-slate-400 text-xs">Consumo pago</p>
                  <p className="font-semibold">
                    R$ {Number(check.resumo.total_consumido).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-slate-400 text-xs">Comandas</p>
                  <p className="font-semibold">
                    {check.resumo.comandas_pagas} pagas ·{' '}
                    {check.resumo.comandas_abertas} abertas ·{' '}
                    {check.resumo.comandas_aguardando_pagamento} no caixa
                  </p>
                </div>
              </div>

              {check.comandas_pendentes.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm font-semibold">Comandas em aberto / não pagas</p>
                  {check.comandas_pendentes.map((c) => (
                    <div key={c.id} className="rounded-xl bg-black/20 p-3 text-sm">
                      <div className="flex justify-between">
                        <span>
                          #{c.numero} · {c.status}
                        </span>
                        <span className="font-bold text-red-300">
                          Restante R$ {Number(c.restante).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {c.itens.map((i) => `${i.qtd}x ${i.nome}`).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {check.pode_liberar && (
                <button
                  onClick={() => releaseMutation.mutate({})}
                  disabled={releaseMutation.isPending}
                  className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 text-lg"
                >
                  Liberar saída e recolher cartão
                </button>
              )}

              {check.decisao === 'bloquear' && user?.role !== 'exit' && (
                <div className="mt-4 space-y-2">
                  <input
                    placeholder="Motivo da liberação forçada (obrigatório)"
                    value={forceNote}
                    onChange={(e) => setForceNote(e.target.value)}
                    className="w-full rounded-xl border border-red-500/40 bg-slate-900 px-4 py-2 text-sm"
                  />
                  <button
                    onClick={() => releaseMutation.mutate({ forcar: true })}
                    disabled={!forceNote || releaseMutation.isPending}
                    className="w-full rounded-xl bg-red-600 text-white font-semibold py-3 disabled:opacity-40"
                  >
                    Liberação forçada (admin)
                  </button>
                </div>
              )}

              {check.decisao === 'bloquear' && user?.role === 'exit' && (
                <p className="mt-3 text-sm text-red-200">
                  Envie o cliente ao caixa para pagar (PIX / débito / crédito) e só depois libere.
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="font-semibold mb-3 text-red-300">Pendências agora</h3>
            <div className="space-y-2 max-h-56 overflow-auto text-sm">
              {(blocked || []).length === 0 && (
                <p className="text-slate-500">Nenhuma pendência</p>
              )}
              {(blocked || []).map(
                (b: {
                  card_uid: string;
                  cliente_nome: string | null;
                  pendencia: number;
                  comandas: number;
                }) => (
                  <button
                    key={b.card_uid}
                    onClick={() => {
                      setUid(b.card_uid);
                      checkMutation.mutate(b.card_uid);
                    }}
                    className="w-full text-left rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-750"
                  >
                    <p className="font-mono text-xs">{b.card_uid}</p>
                    <p>{b.cliente_nome || 'Cliente'}</p>
                    <p className="text-red-300 font-semibold">
                      R$ {Number(b.pendencia).toFixed(2)} · {b.comandas} comanda(s)
                    </p>
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="font-semibold mb-3 text-emerald-300">Liberados hoje</h3>
            <div className="space-y-2 max-h-72 overflow-auto text-sm">
              {(today || []).length === 0 && (
                <p className="text-slate-500">Nenhuma liberação ainda</p>
              )}
              {(today || []).map(
                (e: {
                  id: string;
                  cardUid: string;
                  clienteNome: string | null;
                  status: string;
                  liberadoEm: string;
                  totalConsumido: number;
                }) => (
                  <div key={e.id} className="rounded-lg bg-slate-800 px-3 py-2">
                    <p className="font-mono text-xs">{e.cardUid}</p>
                    <p>{e.clienteNome || 'Cliente'}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(e.liberadoEm).toLocaleTimeString('pt-BR')} · {e.status} · R${' '}
                      {Number(e.totalConsumido).toFixed(2)}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
