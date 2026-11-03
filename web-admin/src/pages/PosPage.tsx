import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  LayoutDashboard,
  Nfc,
  Plus,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/auth';
import { can } from '../shared/permissions';

type Product = {
  id: string;
  nome: string;
  preco: number;
  categoria: string | null;
  ativo: boolean;
};

type Comanda = {
  id: string;
  numero: number;
  status: string;
  card_uid?: string;
  cliente_nome?: string | null;
  subtotal: number;
  desconto: number;
  total: number;
  total_pago: number;
  restante: number;
  itens: {
    id: string;
    produto_id: string;
    nome: string;
    qtd: number;
    preco_unit: number;
    total: number;
  }[];
  pagamentos: { id: string; forma: string; valor: number }[];
};

type PaymentIntent = {
  id: string;
  channel: string;
  forma: string;
  valor: number;
  status: string;
  provider: string;
  pix_copia_cola?: string | null;
  qr_payload?: string | null;
  softpos_instruction?: string | null;
  demo_mode?: boolean;
  mensagem?: string;
};

const PAY_BTNS: { id: 'pix' | 'debito' | 'credito'; label: string; hint: string; cls: string }[] = [
  { id: 'pix', label: 'PIX', hint: 'QR no terminal', cls: 'bg-teal-600 active:bg-teal-500' },
  { id: 'debito', label: 'Débito', hint: 'Aproxime o cartão', cls: 'bg-blue-600 active:bg-blue-500' },
  { id: 'credito', label: 'Crédito', hint: 'Aproxime o cartão', cls: 'bg-indigo-600 active:bg-indigo-500' },
];

export function PosPage() {
  const eventId = useAuthStore((s) => s.eventId);
  const setEventId = useAuthStore((s) => s.setEventId);
  const user = useAuthStore((s) => s.user);
  const [uid, setUid] = useState('04A3B2112233');
  const [nfcListening, setNfcListening] = useState(false);
  const [cartao, setCartao] = useState<{
    uid: string;
    nome: string | null;
    saldo_disponivel: number;
    session_token?: string | null;
    customer_id?: string | null;
  } | null>(null);
  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [category, setCategory] = useState<string>('Todos');
  const [payOpen, setPayOpen] = useState(false);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [copied, setCopied] = useState(false);

  useQuery({
    queryKey: ['pos-events'],
    queryFn: async () => {
      const { data } = await api.get('/events');
      if (!eventId && data?.[0]?.id) setEventId(data[0].id);
      return data;
    },
    enabled: !eventId,
  });

  const { data: products } = useQuery({
    queryKey: ['pos-products', eventId],
    queryFn: async () => {
      const { data } = await api.get('/products', { params: { event_id: eventId } });
      return data as Product[];
    },
    enabled: !!eventId,
  });

  const { data: providers } = useQuery({
    queryKey: ['payment-providers'],
    queryFn: async () => (await api.get('/payments/providers')).data as {
      terminals?: Record<string, { name: string; ready?: boolean }>;
      pix?: { provider: string };
      softpos?: { provider: string };
    },
  });

  const { data: liveIntent } = useQuery({
    queryKey: ['pos-payment-intent', intent?.id],
    queryFn: async () => (await api.get(`/payments/${intent!.id}`)).data as PaymentIntent,
    enabled: !!intent?.id && intent.status === 'awaiting_customer',
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!liveIntent) return;
    setIntent(liveIntent);
    if (liveIntent.status === 'approved') {
      setMessage('Pagamento aprovado');
      if (comanda?.id) {
        api.get(`/comandas/${comanda.id}`).then(({ data }) => setComanda(data));
      }
    }
  }, [liveIntent, comanda?.id]);

  const categories = useMemo(() => {
    const set = new Set((products || []).map((p) => p.categoria || 'Outros'));
    return ['Todos', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return (products || []).filter(
      (p) =>
        p.ativo && (category === 'Todos' || (p.categoria || 'Outros') === category),
    );
  }, [products, category]);

  const tapMutation = useMutation({
    mutationFn: async (uidNfc: string) =>
      (
        await api.post('/comandas/nfc/tap', {
          uid_nfc: uidNfc,
          event_id: eventId || undefined,
        })
      ).data,
    onSuccess: (data) => {
      setCartao(data.cartao);
      setComanda(data.comanda);
      setMessage(
        data.acao === 'comanda_aberta'
          ? `Comanda #${data.comanda.numero} aberta`
          : `Comanda #${data.comanda.numero} retomada`,
      );
      setError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha na leitura NFC');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (produtoId: string) =>
      (
        await api.post(`/comandas/${comanda!.id}/items`, {
          itens: [{ produto_id: produtoId, qtd: 1 }],
        })
      ).data,
    onSuccess: (data) => {
      setComanda(data);
      setMessage('Item adicionado');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Não foi possível adicionar');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) =>
      (await api.delete(`/comandas/${comanda!.id}/items/${itemId}`)).data,
    onSuccess: (data) => setComanda(data),
  });

  const payIntentMutation = useMutation({
    mutationFn: async (forma: 'pix' | 'debito' | 'credito') => {
      if (forma === 'pix') {
        return (await api.post('/payments/pix', { comanda_id: comanda!.id })).data as PaymentIntent;
      }
      return (
        await api.post('/payments/card', { comanda_id: comanda!.id, forma })
      ).data as PaymentIntent;
    },
    onSuccess: (data) => {
      setIntent(data);
      setError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha ao iniciar pagamento');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/payments/${intent!.id}/confirm`, {})).data,
    onSuccess: (data) => {
      setIntent(data);
      if (data.comanda) setComanda(data.comanda);
      setMessage(data.mensagem || 'Pago');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha ao confirmar');
    },
  });

  const cashMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/comandas/${comanda!.id}/pay`, {
          pagamentos: [{ forma: 'dinheiro', valor: Number(comanda!.restante) }],
        })
      ).data,
    onSuccess: (data) => {
      setComanda(data);
      setMessage(data.mensagem || 'Pago em dinheiro');
      setPayOpen(false);
      setIntent(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha no pagamento');
    },
  });

  const handleTap = useCallback(() => {
    if (!uid.trim()) {
      setError('Informe o UID da pulseira/cartão');
      return;
    }
    tapMutation.mutate(uid.trim());
  }, [uid, tapMutation]);

  useEffect(() => {
    const nfc = (
      window as unknown as {
        NDEFReader?: new () => {
          scan: () => Promise<void>;
          onreading: ((event: { serialNumber?: string }) => void) | null;
        };
      }
    ).NDEFReader;

    if (!nfc || !nfcListening) return;

    let cancelled = false;
    const reader = new nfc();
    reader.onreading = (event) => {
      if (cancelled) return;
      const serial = (event.serialNumber || '').replace(/:/g, '').toUpperCase();
      if (serial) {
        setUid(serial);
        tapMutation.mutate(serial);
      }
    };
    reader.scan().catch(() => {
      setError('Não foi possível iniciar o leitor NFC do dispositivo');
      setNfcListening(false);
    });

    return () => {
      cancelled = true;
    };
  }, [nfcListening, tapMutation]);

  function resetPos() {
    setComanda(null);
    setCartao(null);
    setPayOpen(false);
    setIntent(null);
    setMessage('Aproxime o próximo cartão');
    setError('');
  }

  async function copyPix() {
    if (!intent?.pix_copia_cola) return;
    await navigator.clipboard.writeText(intent.pix_copia_cola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canAddItems = comanda?.status === 'open';
  const canPay =
    comanda &&
    (comanda.status === 'pending_payment' || comanda.status === 'open') &&
    comanda.total > 0 &&
    Number(comanda.restante) > 0;
  const isPaid = comanda?.status === 'paid' || Number(comanda?.restante || 1) <= 0;
  const terminalLabel =
    providers?.softpos?.provider && providers.softpos.provider !== 'demo'
      ? providers.softpos.provider
      : 'demo';
  const qrUrl = intent?.qr_payload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(intent.qr_payload)}`
    : null;

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {can(user?.role_normalized ?? user?.role, 'reports.view') && (
          <Link
            to="/"
            className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-300"
            aria-label="Painel"
          >
            <LayoutDashboard size={20} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-amber-400">PDV Cashless</p>
          <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">
            Terminal {terminalLabel} · pulseira NFC
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNfcListening((v) => !v)}
          className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-bold ${
            nfcListening ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-200'
          }`}
        >
          <Nfc size={18} />
          {nfcListening ? 'NFC' : 'NFC'}
        </button>
      </header>

      {(message || error) && (
        <div
          className={`px-4 py-2 text-sm font-medium ${
            error ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 flex-1 flex-col p-3">
          <div className="mb-3 flex gap-2">
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTap()}
              className="min-h-14 flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 font-mono text-base"
              placeholder="Aproxime ou digite o UID"
            />
            <button
              type="button"
              onClick={handleTap}
              disabled={tapMutation.isPending}
              className="min-h-14 min-w-24 rounded-2xl bg-amber-500 px-5 text-base font-bold text-slate-900 disabled:opacity-50"
            >
              {tapMutation.isPending ? '...' : 'Ler'}
            </button>
          </div>

          {cartao && (
            <p className="mb-2 truncate text-sm text-slate-400">
              {cartao.nome || 'Cliente'} · {cartao.uid} · saldo R${' '}
              {Number(cartao.saldo_disponivel).toFixed(2)}
            </p>
          )}

          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
                  category === cat
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-auto sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                disabled={!canAddItems || addItemMutation.isPending}
                onClick={() => addItemMutation.mutate(product.id)}
                className="flex min-h-24 flex-col justify-between rounded-2xl border border-slate-700 bg-slate-900 p-3 text-left active:border-amber-400 disabled:opacity-35"
              >
                <span className="flex items-start justify-between gap-1">
                  <span className="text-sm font-semibold leading-tight sm:text-base">
                    {product.nome}
                  </span>
                  <Plus size={16} className="shrink-0 text-amber-400" />
                </span>
                <span className="mt-2 text-lg font-bold text-amber-400">
                  R$ {Number(product.preco).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
          {!comanda && (
            <p className="mt-2 text-center text-sm text-slate-500">
              Aproxime a pulseira para liberar o cardápio
            </p>
          )}
        </section>

        <aside className="flex max-h-[42vh] shrink-0 flex-col border-t border-slate-800 bg-slate-900 lg:max-h-none lg:w-[22rem] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-lg font-bold">
                {comanda ? `Comanda #${comanda.numero}` : 'Sem comanda'}
              </p>
              <p className="text-xs uppercase text-slate-500">{comanda?.status || 'aguardando'}</p>
            </div>
            {isPaid && (
              <button
                type="button"
                onClick={resetPos}
                className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-900"
              >
                Próximo
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-auto px-3">
            {!comanda?.itens?.length && (
              <p className="py-6 text-center text-sm text-slate-500">Nenhum item</p>
            )}
            {comanda?.itens.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {item.qtd}x {item.nome}
                  </p>
                  <p className="text-xs text-slate-400">R$ {Number(item.preco_unit).toFixed(2)}</p>
                </div>
                <div className="ml-2 flex items-center gap-2">
                  <span className="font-semibold">R$ {Number(item.total).toFixed(2)}</span>
                  {canAddItems && (
                    <button
                      type="button"
                      onClick={() => removeItemMutation.mutate(item.id)}
                      className="p-2 text-red-400"
                      aria-label="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-end justify-between">
              <span className="text-slate-400">A pagar</span>
              <span className="text-3xl font-bold tabular-nums text-amber-400">
                R$ {Number(comanda?.restante ?? 0).toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              disabled={!canPay || isPaid}
              onClick={() => {
                setPayOpen(true);
                setIntent(null);
              }}
              className="min-h-16 w-full rounded-2xl bg-teal-500 text-xl font-bold text-slate-900 disabled:opacity-40"
            >
              PAGAR
            </button>
          </div>
        </aside>
      </div>

      {payOpen && comanda && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Pagamento</h2>
              <button
                type="button"
                onClick={() => {
                  setPayOpen(false);
                  setIntent(null);
                }}
                className="rounded-xl bg-slate-800 p-3"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-center text-4xl font-bold tabular-nums">
              R$ {Number(comanda.restante).toFixed(2)}
            </p>

            {isPaid ? (
              <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={56} />
                <p className="text-2xl font-bold">Pago</p>
                <button
                  type="button"
                  onClick={resetPos}
                  className="mt-6 min-h-16 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-slate-900"
                >
                  Próximo cliente
                </button>
              </div>
            ) : !intent ? (
              <div className="space-y-3">
                {PAY_BTNS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={payIntentMutation.isPending}
                    onClick={() => payIntentMutation.mutate(b.id)}
                    className={`flex min-h-20 w-full flex-col items-center justify-center rounded-2xl font-bold text-white disabled:opacity-50 ${b.cls}`}
                  >
                    <span className="text-xl">{b.label}</span>
                    <span className="text-xs font-normal opacity-80">{b.hint}</span>
                  </button>
                ))}
                <button
                  type="button"
                  disabled={cashMutation.isPending}
                  onClick={() => cashMutation.mutate()}
                  className="flex min-h-16 w-full items-center justify-center rounded-2xl bg-emerald-700 font-bold"
                >
                  Dinheiro
                </button>
              </div>
            ) : intent.channel === 'pix' ? (
              <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-center font-semibold text-teal-300">Aguardando PIX</p>
                {qrUrl && (
                  <img
                    src={qrUrl}
                    alt="QR PIX"
                    className="mx-auto w-56 rounded-2xl bg-white p-3"
                  />
                )}
                <button
                  type="button"
                  onClick={copyPix}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-600 text-sm"
                >
                  <Copy size={16} />
                  {copied ? 'Copiado' : 'Copiar código'}
                </button>
                {intent.demo_mode && (
                  <button
                    type="button"
                    onClick={() => confirmMutation.mutate()}
                    className="min-h-14 w-full rounded-xl bg-emerald-500 font-bold text-slate-900"
                  >
                    Simular PIX recebido
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIntent(null)}
                  className="w-full py-2 text-sm text-slate-400"
                >
                  Outra forma
                </button>
              </div>
            ) : (
              <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-dashed border-amber-400/60">
                  {intent.forma === 'pix' ? (
                    <QrCode className="text-amber-400" size={40} />
                  ) : (
                    <CreditCard className="text-amber-400" size={40} />
                  )}
                </div>
                <p className="text-xl font-bold uppercase">{intent.forma}</p>
                <p className="text-sm text-slate-300">
                  {intent.softpos_instruction ||
                    'Confirme o pagamento na maquininha (Cielo, Point ou PagBank).'}
                </p>
                {intent.demo_mode && (
                  <button
                    type="button"
                    onClick={() => confirmMutation.mutate()}
                    className="min-h-14 w-full rounded-xl bg-emerald-500 font-bold text-slate-900"
                  >
                    Simular cartão aprovado
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIntent(null)}
                  className="w-full py-2 text-sm text-slate-400"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
