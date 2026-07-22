import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, CreditCard, QrCode, Smartphone, X } from 'lucide-react';
import api from '../services/api';

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

type Comanda = {
  id: string;
  numero: number;
  status: string;
  restante: number;
  total: number;
  cliente_nome?: string | null;
  card_uid?: string;
};

export function PhonePayPage() {
  const [params] = useSearchParams();
  const comandaId = params.get('comanda') || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: comanda, refetch } = useQuery({
    queryKey: ['phone-pay-comanda', comandaId],
    queryFn: async () => (await api.get(`/comandas/${comandaId}`)).data as Comanda,
    enabled: !!comandaId,
    refetchInterval: intent?.status === 'awaiting_customer' ? 3000 : false,
  });

  const { data: liveIntent } = useQuery({
    queryKey: ['payment-intent', intent?.id],
    queryFn: async () => (await api.get(`/payments/${intent!.id}`)).data as PaymentIntent,
    enabled: !!intent?.id && intent.status === 'awaiting_customer',
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (liveIntent) setIntent(liveIntent);
    if (liveIntent?.status === 'approved') {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    }
  }, [liveIntent, refetch, queryClient]);

  const pixMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/payments/pix', { comanda_id: comandaId })).data as PaymentIntent,
    onSuccess: (data) => {
      setIntent(data);
      setError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha ao gerar PIX');
    },
  });

  const cardMutation = useMutation({
    mutationFn: async (forma: 'debito' | 'credito') =>
      (
        await api.post('/payments/card', { comanda_id: comandaId, forma })
      ).data as PaymentIntent,
    onSuccess: (data) => {
      setIntent(data);
      setError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha ao iniciar cartão');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/payments/${intent!.id}/confirm`, {})).data,
    onSuccess: (data) => {
      setIntent(data);
      refetch();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha ao confirmar');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => api.post(`/payments/${intent!.id}/cancel`, {}),
    onSuccess: () => setIntent(null),
  });

  async function copyPix() {
    if (!intent?.pix_copia_cola) return;
    await navigator.clipboard.writeText(intent.pix_copia_cola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!comandaId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <p className="text-slate-400">Abra pelo PDV com uma comanda selecionada.</p>
      </div>
    );
  }

  const paid = comanda?.status === 'paid' || Number(comanda?.restante || 1) <= 0;
  const qrUrl = intent?.qr_payload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(intent.qr_payload)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 inline-flex items-center gap-1">
            <Smartphone size={12} /> Pagamento no celular
          </p>
          <h1 className="text-lg font-bold text-amber-400">
            Comanda #{comanda?.numero ?? '…'}
          </h1>
        </div>
        <button
          onClick={() => navigate('/pos')}
          className="rounded-lg bg-slate-800 p-2 text-slate-300"
        >
          <X size={18} />
        </button>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center">
          <p className="text-slate-400 text-sm">{comanda?.cliente_nome || 'Cliente'}</p>
          <p className="text-4xl font-bold mt-1 tracking-tight">
            R$ {Number(comanda?.restante ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono">{comanda?.card_uid}</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {paid ? (
          <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 p-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
            <p className="text-xl font-bold">Pago</p>
            <p className="text-sm text-slate-300">Cliente pode ir à saída para liberação.</p>
            <button
              onClick={() => navigate('/pos')}
              className="w-full rounded-xl bg-emerald-500 text-slate-900 font-bold py-4"
            >
              Próximo cliente
            </button>
          </div>
        ) : !intent ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-400 text-center">
              Escolha como o cliente vai pagar
            </p>
            <button
              onClick={() => pixMutation.mutate()}
              disabled={pixMutation.isPending}
              className="w-full rounded-2xl bg-teal-600 hover:bg-teal-500 py-6 font-bold text-lg flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <QrCode size={32} />
              PIX
              <span className="text-xs font-normal opacity-80">QR Code / copia e cola</span>
            </button>
            <button
              onClick={() => cardMutation.mutate('debito')}
              disabled={cardMutation.isPending}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 py-6 font-bold text-lg flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <CreditCard size={32} />
              Débito por aproximação
              <span className="text-xs font-normal opacity-80">NFC do celular (SoftPOS)</span>
            </button>
            <button
              onClick={() => cardMutation.mutate('credito')}
              disabled={cardMutation.isPending}
              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-6 font-bold text-lg flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <CreditCard size={32} />
              Crédito por aproximação
              <span className="text-xs font-normal opacity-80">NFC do celular (SoftPOS)</span>
            </button>
          </div>
        ) : intent.channel === 'pix' ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <p className="text-center font-semibold text-teal-300">Aguardando PIX</p>
            {qrUrl && (
              <img
                src={qrUrl}
                alt="QR Code PIX"
                className="mx-auto rounded-xl bg-white p-3 w-64 h-64"
              />
            )}
            <button
              onClick={copyPix}
              className="w-full rounded-xl border border-slate-600 py-3 text-sm inline-flex items-center justify-center gap-2"
            >
              <Copy size={16} />
              {copied ? 'Copiado!' : 'Copiar código PIX'}
            </button>
            <p className="text-[10px] text-slate-500 break-all font-mono max-h-16 overflow-auto">
              {intent.pix_copia_cola}
            </p>
            {intent.demo_mode && (
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="w-full rounded-xl bg-emerald-500 text-slate-900 font-bold py-4"
              >
                Simular PIX recebido (demo)
              </button>
            )}
            <button
              onClick={() => cancelMutation.mutate()}
              className="w-full text-sm text-slate-400 py-2"
            >
              Cancelar e escolher outra forma
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 text-center">
            <div className="mx-auto w-24 h-24 rounded-full border-4 border-dashed border-amber-400/60 flex items-center justify-center animate-pulse">
              <CreditCard className="text-amber-400" size={40} />
            </div>
            <p className="text-xl font-bold uppercase">
              {intent.forma === 'credito' ? 'Crédito' : 'Débito'}
            </p>
            <p className="text-sm text-slate-300">
              {intent.softpos_instruction ||
                'Aproxime o cartão na parte de trás do celular'}
            </p>
            <p className="text-2xl font-bold text-amber-400">
              R$ {Number(intent.valor).toFixed(2)}
            </p>
            {intent.demo_mode && (
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="w-full rounded-xl bg-emerald-500 text-slate-900 font-bold py-4"
              >
                Simular cartão aprovado (demo)
              </button>
            )}
            <button
              onClick={() => cancelMutation.mutate()}
              className="w-full text-sm text-slate-400 py-2"
            >
              Cancelar
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
