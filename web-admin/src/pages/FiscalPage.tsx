import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Printer, RefreshCw, Settings2, XCircle } from 'lucide-react';
import api from '../services/api';

type PendingOrder = {
  id: string;
  total: number;
  criado_em: string;
  itens: { produto: string; qtd: number; preco_unit: number; total: number }[];
};

type FiscalStatus = {
  tenant_id: string;
  provider: string;
  configurado: boolean;
  cnpj: string | null;
  razao_social: string | null;
  ambiente: string;
  nfce_serie: number;
  empresa_uf_codigo: string;
  focus_nfe_token_masked: string | null;
  mensagem: string;
};

type NfceDoc = {
  id: string;
  orderId: string;
  numero: number | null;
  serie: number;
  chaveAcesso: string | null;
  protocolo: string | null;
  clienteCpf: string | null;
  valor: number;
  status: string;
  ambiente: string;
  danfeUrl: string | null;
  emitidoEm: string;
  mensagemErro: string | null;
};

export function FiscalPage() {
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState('');
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<NfceDoc | null>(null);
  const [cfgToken, setCfgToken] = useState('');
  const [cfgAmbiente, setCfgAmbiente] = useState('homologacao');
  const [cfgCnpj, setCfgCnpj] = useState('');
  const [cfgRazao, setCfgRazao] = useState('');
  const [cfgSerie, setCfgSerie] = useState('1');
  const [cfgUf, setCfgUf] = useState('13');
  const [cfgMsg, setCfgMsg] = useState('');

  const { data: status } = useQuery({
    queryKey: ['fiscal-status'],
    queryFn: async () => (await api.get('/fiscal/status')).data as FiscalStatus,
  });

  useEffect(() => {
    if (!status) return;
    setCfgAmbiente(status.ambiente || 'homologacao');
    setCfgCnpj(status.cnpj || '');
    setCfgRazao(status.razao_social || '');
    setCfgSerie(String(status.nfce_serie || 1));
    setCfgUf(status.empresa_uf_codigo || '13');
  }, [status]);

  const { data: pendingOrders } = useQuery({
    queryKey: ['fiscal-pending'],
    queryFn: async () => (await api.get('/fiscal/orders/pending')).data as PendingOrder[],
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['nfce'],
    queryFn: async () => (await api.get('/fiscal/nfce')).data as NfceDoc[],
  });

  const emitMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { order_id: orderId };
      if (cpf) body.cliente_cpf = cpf.replace(/\D/g, '');
      if (nome) body.cliente_nome = nome;
      return (await api.post('/fiscal/nfce', body)).data;
    },
    onSuccess: (doc) => {
      setSelectedDoc(doc);
      setOrderId('');
      setCpf('');
      setNome('');
      queryClient.invalidateQueries({ queryKey: ['nfce'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-pending'] });
    },
  });

  const demoMutation = useMutation({
    mutationFn: async () => (await api.post('/fiscal/demo-order')).data as PendingOrder,
    onSuccess: (order) => {
      if (order?.id) setOrderId(order.id);
      queryClient.invalidateQueries({ queryKey: ['fiscal-pending'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/fiscal/nfce/${id}/cancel`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfce'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-pending'] });
    },
  });

  const configMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        focus_nfe_ambiente: cfgAmbiente,
        cnpj: cfgCnpj.replace(/\D/g, '') || undefined,
        razao_social: cfgRazao || undefined,
        nfce_serie: Number(cfgSerie) || 1,
        empresa_uf_codigo: cfgUf || undefined,
      };
      if (cfgToken.trim()) body.focus_nfe_token = cfgToken.trim();
      return (await api.patch('/fiscal/config', body)).data as FiscalStatus;
    },
    onSuccess: () => {
      setCfgToken('');
      setCfgMsg('Configuração fiscal salva');
      queryClient.invalidateQueries({ queryKey: ['fiscal-status'] });
    },
    onError: (e) => {
      setCfgMsg(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Falha ao salvar configuração',
      );
    },
  });

  const selectedOrder = useMemo(
    () => pendingOrders?.find((o) => o.id === orderId),
    [pendingOrders, orderId],
  );

  function statusBadge(s: string) {
    const map: Record<string, string> = {
      authorized: 'bg-emerald-500/20 text-emerald-400',
      pending: 'bg-amber-500/20 text-amber-300',
      failed: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-slate-700 text-slate-300',
    };
    return map[s] ?? 'bg-slate-700 text-slate-300';
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Emitidor de Nota Fiscal (NFC-e)</h2>
          <p className="text-slate-400 text-sm mt-1">
            Emita NFC-e de pedidos pagos, visualize DANFE e baixe o XML
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
          <p className="text-slate-400">Provedor</p>
          <p className="font-semibold text-amber-400">
            {status?.provider === 'focus_nfe' ? 'Focus NFe' : 'Homologação local'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">{status?.mensagem}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mb-8">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <Settings2 size={18} className="text-amber-400" />
          Configuração Focus NFe (desta empresa)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Token Focus é por tenant. Sem token, a emissão usa homologação local.
          {status?.focus_nfe_token_masked
            ? ` Token atual: ${status.focus_nfe_token_masked}`
            : ' Nenhum token salvo.'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-300">Token Focus NFe</label>
            <input
              type="password"
              value={cfgToken}
              onChange={(e) => setCfgToken(e.target.value)}
              placeholder={
                status?.focus_nfe_token_masked
                  ? 'Deixe em branco para manter o atual'
                  : 'Cole o token da Focus'
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300">Ambiente</label>
            <select
              value={cfgAmbiente}
              onChange={(e) => setCfgAmbiente(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1"
            >
              <option value="homologacao">Homologação</option>
              <option value="producao">Produção</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-300">CNPJ (14 dígitos)</label>
            <input
              value={cfgCnpj}
              onChange={(e) => setCfgCnpj(e.target.value)}
              maxLength={18}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300">Razão social</label>
            <input
              value={cfgRazao}
              onChange={(e) => setCfgRazao(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300">Série NFC-e</label>
            <input
              type="number"
              min={1}
              value={cfgSerie}
              onChange={(e) => setCfgSerie(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300">Código UF IBGE</label>
            <input
              value={cfgUf}
              onChange={(e) => setCfgUf(e.target.value)}
              placeholder="13 = AM"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCfgMsg('');
              configMutation.mutate();
            }}
            disabled={configMutation.isPending}
            className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 disabled:opacity-50"
          >
            {configMutation.isPending ? 'Salvando...' : 'Salvar configuração fiscal'}
          </button>
          {cfgMsg && (
            <p
              className={`text-sm ${
                configMutation.isError ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {cfgMsg}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText size={18} className="text-amber-400" />
            Emitir NFC-e
          </h3>

          <label className="text-sm text-slate-300">Pedido pago sem nota</label>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1 mb-4"
          >
            <option value="">Selecione um pedido...</option>
            {pendingOrders?.map((order) => (
              <option key={order.id} value={order.id}>
                {order.id.slice(0, 8)}... — R$ {Number(order.total).toFixed(2)} —{' '}
                {new Date(order.criado_em).toLocaleString('pt-BR')}
              </option>
            ))}
          </select>

          {selectedOrder && (
            <div className="rounded-lg bg-slate-800 p-3 mb-4 text-sm space-y-1">
              {selectedOrder.itens?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-300">
                  <span>
                    {item.qtd}x {item.produto}
                  </span>
                  <span>R$ {Number(item.total).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-amber-400 pt-2 border-t border-slate-700">
                <span>Total</span>
                <span>R$ {Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>
          )}

          <label className="text-sm text-slate-300">CPF do consumidor (opcional)</label>
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="Somente números"
            maxLength={11}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1 mb-4"
          />

          <label className="text-sm text-slate-300">Nome do consumidor (opcional)</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1 mb-4"
          />

          <button
            onClick={() => emitMutation.mutate()}
            disabled={!orderId || emitMutation.isPending}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-2.5 disabled:opacity-50"
          >
            {emitMutation.isPending ? 'Emitindo...' : 'Emitir NFC-e'}
          </button>

          <button
            type="button"
            onClick={() => demoMutation.mutate()}
            disabled={demoMutation.isPending}
            className="w-full mt-3 rounded-lg border border-slate-600 text-slate-200 py-2.5 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {demoMutation.isPending ? 'Gerando...' : 'Gerar pedido demo para emitir'}
          </button>

          {emitMutation.isError && (
            <p className="mt-3 text-sm text-red-400">
              {(emitMutation.error as { response?: { data?: { message?: string } } })?.response
                ?.data?.message || 'Falha ao emitir NFC-e'}
            </p>
          )}
          {emitMutation.isSuccess && (
            <p className="mt-3 text-sm text-emerald-400">NFC-e autorizada com sucesso!</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold mb-4">Detalhes da nota</h3>
          {!selectedDoc ? (
            <p className="text-slate-500 text-sm">
              Selecione uma nota na lista ou emita uma nova para ver os detalhes.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-slate-400">Número/Série:</span>{' '}
                {selectedDoc.numero ?? '—'} / {selectedDoc.serie}
              </p>
              <p>
                <span className="text-slate-400">Status:</span>{' '}
                <span className={`px-2 py-0.5 rounded text-xs ${statusBadge(selectedDoc.status)}`}>
                  {selectedDoc.status}
                </span>
              </p>
              <p>
                <span className="text-slate-400">Valor:</span> R${' '}
                {Number(selectedDoc.valor).toFixed(2)}
              </p>
              <p>
                <span className="text-slate-400">CPF:</span> {selectedDoc.clienteCpf ?? '—'}
              </p>
              <p className="break-all font-mono text-xs">
                <span className="text-slate-400">Chave:</span> {selectedDoc.chaveAcesso ?? '—'}
              </p>
              <p>
                <span className="text-slate-400">Protocolo:</span> {selectedDoc.protocolo ?? '—'}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href={`/api/v1/fiscal/nfce/${selectedDoc.id}/danfe`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 hover:bg-slate-600"
                >
                  <Printer size={16} />
                  Ver DANFE
                </a>
                <a
                  href={`/api/v1/fiscal/nfce/${selectedDoc.id}/xml`}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 hover:bg-slate-600"
                  onClick={async (e) => {
                    e.preventDefault();
                    const token = localStorage.getItem('pdv_token');
                    const res = await fetch(`/api/v1/fiscal/nfce/${selectedDoc.id}/xml`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `nfce-${selectedDoc.numero || selectedDoc.id}.xml`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <RefreshCw size={16} />
                  Baixar XML
                </a>
                {selectedDoc.status === 'authorized' && (
                  <button
                    onClick={() => cancelMutation.mutate(selectedDoc.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 text-red-300 px-3 py-2 hover:bg-red-500/30"
                  >
                    <XCircle size={16} />
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-800 px-4 py-3 font-semibold">Notas emitidas</div>
        {isLoading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="text-left p-3">Nº</th>
                <th className="text-left p-3">Chave</th>
                <th className="text-right p-3">Valor</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">Emitida em</th>
                <th className="text-center p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents?.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Nenhuma NFC-e emitida ainda. Faça uma venda e emita a nota aqui.
                  </td>
                </tr>
              )}
              {documents?.map((doc) => (
                <tr key={doc.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{doc.numero ?? '—'}</td>
                  <td className="p-3 font-mono text-xs max-w-[220px] truncate">
                    {doc.chaveAcesso ?? '—'}
                  </td>
                  <td className="p-3 text-right">R$ {Number(doc.valor).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="p-3">{new Date(doc.emitidoEm).toLocaleString('pt-BR')}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="text-amber-400 hover:text-amber-300 text-xs"
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
