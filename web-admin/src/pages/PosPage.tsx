import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Nfc, Plus, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

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

type PaymentMethod = { id: string; label: string };

const PAYMENT_COLORS: Record<string, string> = {
  dinheiro: 'bg-emerald-600',
  pix: 'bg-teal-600',
  credito: 'bg-indigo-600',
  debito: 'bg-blue-600',
  saldo_pulseira: 'bg-amber-600',
  cortesia: 'bg-slate-600',
  outro: 'bg-violet-600',
};

export function PosPage() {
  const eventId = useAuthStore((s) => s.eventId);
  const queryClient = useQueryClient();
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
  const [payForma, setPayForma] = useState('pix');
  const [payValor, setPayValor] = useState('');
  const [category, setCategory] = useState<string>('Todos');

  const { data: products } = useQuery({
    queryKey: ['pos-products', eventId],
    queryFn: async () => {
      const { data } = await api.get('/products', { params: { event_id: eventId } });
      return data as Product[];
    },
    enabled: !!eventId,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => (await api.get('/comandas/payment-methods')).data as PaymentMethod[],
  });

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
      setPayValor(String(data.comanda.restante || data.comanda.total || ''));
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
      setMessage('Item adicionado à comanda');
      setPayValor(String(data.restante || data.total));
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Não foi possível adicionar');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) =>
      (await api.delete(`/comandas/${comanda!.id}/items/${itemId}`)).data,
    onSuccess: (data) => {
      setComanda(data);
      setPayValor(String(data.restante || data.total));
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => (await api.post(`/comandas/${comanda!.id}/close`, {})).data,
    onSuccess: (data) => {
      setComanda(data);
      setMessage('Comanda fechada — aguardando pagamento');
      setPayValor(String(data.restante));
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha ao fechar');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async () => (await api.post(`/comandas/${comanda!.id}/reopen`)).data,
    onSuccess: (data) => {
      setComanda(data);
      setMessage('Comanda reaberta — pode adicionar itens');
    },
  });

  const payMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/comandas/${comanda!.id}/pay`, {
          pagamentos: [{ forma: payForma, valor: Number(payValor) }],
        })
      ).data,
    onSuccess: (data) => {
      setComanda(data);
      setMessage(data.mensagem);
      setError('');
      if (data.liberado_para_nova_comanda) {
        setPayValor('');
        queryClient.invalidateQueries({ queryKey: ['card-status'] });
      } else {
        setPayValor(String(data.restante));
      }
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

  // Web NFC (Chrome Android) — aproximação real
  useEffect(() => {
    const nfc = (window as unknown as { NDEFReader?: new () => {
      scan: () => Promise<void>;
      onreading: ((event: { serialNumber?: string }) => void) | null;
    } }).NDEFReader;

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
    setMessage('Aproxime o próximo cartão');
    setError('');
  }

  const canAddItems = comanda?.status === 'open';
  const canPay =
    comanda &&
    (comanda.status === 'pending_payment' || comanda.status === 'open') &&
    comanda.total > 0;
  const isPaid = comanda?.status === 'paid';

  return (
    <div className="flex min-h-0 flex-col gap-4 md:h-[calc(100dvh-3rem)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold sm:text-2xl">PDV · Comanda NFC</h2>
          <p className="text-slate-400 text-sm">
            Aproxime a pulseira, lance produtos e feche só após o pagamento ·{' '}
            <a href="/cadastro" className="text-amber-400 hover:text-amber-300">
              Cadastro / check-in
            </a>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setNfcListening((v) => !v)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold sm:w-auto ${
              nfcListening
                ? 'bg-emerald-500 text-slate-900'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            <Nfc size={16} />
            {nfcListening ? 'NFC ativo' : 'Ativar NFC'}
          </button>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            error
              ? 'bg-red-500/10 border border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* NFC + Comanda */}
        <section className="xl:col-span-4 flex flex-col gap-4 min-h-0">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <label className="text-xs text-slate-400">UID / Aproximação NFC</label>
            <div className="flex gap-2 mt-1">
              <input
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTap()}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm"
                placeholder="Aproxime ou digite o UID"
              />
              <button
                onClick={handleTap}
                disabled={tapMutation.isPending}
                className="rounded-lg bg-amber-500 text-slate-900 px-4 font-semibold disabled:opacity-50"
              >
                {tapMutation.isPending ? '...' : 'Ler'}
              </button>
            </div>
            {cartao && (
              <div className="mt-3 rounded-lg bg-slate-800 p-3 text-sm">
                <div className="flex items-center gap-2 text-amber-300">
                  <CreditCard size={16} />
                  <span className="font-mono">{cartao.uid}</span>
                </div>
                <p className="mt-1">{cartao.nome || 'Cliente'}</p>
                <p className="text-slate-400">
                  Saldo pulseira: R$ {Number(cartao.saldo_disponivel).toFixed(2)}
                </p>
                {cartao.session_token && (
                  <p className="text-xs text-slate-500 mt-1 font-mono truncate">
                    Token: {cartao.session_token}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex-1 min-h-0 flex flex-col">
            {!comanda ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Aproxime um cartão para abrir ou retomar a comanda
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold">Comanda #{comanda.numero}</p>
                    <p className="text-xs text-slate-400 uppercase">{comanda.status}</p>
                  </div>
                  {isPaid && (
                    <button
                      onClick={resetPos}
                      className="text-xs rounded-lg bg-amber-500 text-slate-900 px-3 py-1.5 font-semibold"
                    >
                      Nova comanda
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-auto space-y-2">
                  {comanda.itens.length === 0 && (
                    <p className="text-slate-500 text-sm">Nenhum item ainda</p>
                  )}
                  {comanda.itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {item.qtd}x {item.nome}
                        </p>
                        <p className="text-slate-400 text-xs">
                          R$ {Number(item.preco_unit).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>R$ {Number(item.total).toFixed(2)}</span>
                        {canAddItems && (
                          <button
                            onClick={() => removeItemMutation.mutate(item.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-3 mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal</span>
                    <span>R$ {Number(comanda.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pago</span>
                    <span>R$ {Number(comanda.total_pago).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-amber-400">
                    <span>Restante</span>
                    <span>R$ {Number(comanda.restante).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {canAddItems && (
                    <button
                      onClick={() => closeMutation.mutate()}
                      disabled={!comanda.itens.length || closeMutation.isPending}
                      className="flex-1 rounded-lg bg-slate-100 text-slate-900 py-2 font-semibold disabled:opacity-40"
                    >
                      Fechar comanda
                    </button>
                  )}
                  {canPay && !isPaid && (
                    <a
                      href={`/pagar?comanda=${comanda.id}`}
                      className="flex-1 text-center rounded-lg bg-teal-500 text-slate-900 py-2 font-semibold"
                    >
                      Pagar no celular (PIX / Cartão)
                    </a>
                  )}
                  {comanda.status === 'pending_payment' && comanda.total_pago === 0 && (
                    <button
                      onClick={() => reopenMutation.mutate()}
                      className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Produtos */}
        <section className="xl:col-span-5 rounded-xl border border-slate-800 bg-slate-900 p-4 min-h-0 flex flex-col">
          <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                  category === cat
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-auto flex-1 content-start">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                disabled={!canAddItems || addItemMutation.isPending}
                onClick={() => addItemMutation.mutate(product.id)}
                className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-left hover:border-amber-500/60 disabled:opacity-40 disabled:hover:border-slate-700 transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-sm leading-tight">{product.nome}</p>
                  <Plus size={14} className="text-amber-400 shrink-0" />
                </div>
                <p className="text-amber-400 font-semibold mt-2">
                  R$ {Number(product.preco).toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {product.categoria || 'Outros'}
                </p>
              </button>
            ))}
          </div>
          {!canAddItems && comanda && !isPaid && (
            <p className="text-xs text-slate-500 mt-2">
              Comanda fechada. Reabra para adicionar itens ou conclua o pagamento.
            </p>
          )}
          {!comanda && (
            <p className="text-xs text-slate-500 mt-2">
              Leia um cartão NFC para liberar o cardápio.
            </p>
          )}
        </section>

        {/* Pagamento */}
        <section className="xl:col-span-3 rounded-xl border border-slate-800 bg-slate-900 p-4 min-h-0 flex flex-col">
          <h3 className="font-semibold mb-1">Pagamento</h3>
          <p className="text-xs text-slate-500 mb-3">
            No celular: use PIX ou cartão por aproximação (NFC SoftPOS)
          </p>
          {canPay && !isPaid && comanda && (
            <a
              href={`/pagar?comanda=${comanda.id}`}
              className="mb-4 w-full text-center rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold py-3"
            >
              Abrir tela de pagamento
            </a>
          )}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(paymentMethods || []).map((m) => (
              <button
                key={m.id}
                onClick={() => setPayForma(m.id)}
                className={`rounded-lg px-2 py-2 text-xs font-medium ${
                  payForma === m.id
                    ? `${PAYMENT_COLORS[m.id] || 'bg-amber-600'} text-white`
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <label className="text-xs text-slate-400">Valor</label>
          <input
            type="number"
            step="0.01"
            value={payValor}
            onChange={(e) => setPayValor(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 mt-1 mb-3"
          />

          <button
            onClick={() => payMutation.mutate()}
            disabled={!canPay || !payValor || payMutation.isPending || isPaid}
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 disabled:opacity-40"
          >
            {payMutation.isPending ? 'Processando...' : 'Confirmar pagamento'}
          </button>

          {comanda?.pagamentos?.length ? (
            <div className="mt-4 space-y-1 text-xs">
              <p className="text-slate-400 mb-1">Pagamentos registrados</p>
              {comanda.pagamentos.map((p) => (
                <div key={p.id} className="flex justify-between text-slate-300">
                  <span>{p.forma}</span>
                  <span>R$ {Number(p.valor).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {isPaid && (
            <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-300">
              Comanda quitada. O mesmo cartão já pode abrir uma nova comanda.
              <button
                onClick={resetPos}
                className="mt-2 w-full rounded-lg bg-emerald-500 text-slate-900 py-2 font-semibold inline-flex items-center justify-center gap-2"
              >
                <X size={14} />
                Limpar e próximo cliente
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
