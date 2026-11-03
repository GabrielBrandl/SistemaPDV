import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/auth';
import { formatBRL, labelStatus } from '../shared/format';
import { Button } from './ui/Button';
import { Money } from './ui/Money';

type PaymentIntent = {
  id: string;
  status: string;
  valor: number;
  provider: string;
  demo_mode?: boolean;
  pix_copia_cola?: string | null;
  qr_payload?: string | null;
  softpos_instruction?: string | null;
  expires_at?: string | null;
  mensagem?: string;
};

type Step = 'form' | 'awaiting' | 'approved' | 'done';

const FORMAS = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'cartao_debito', label: 'Cartão Débito' },
  { value: 'dinheiro', label: 'Dinheiro' },
];

const QUICK_VALUES = [20, 50, 100, 200];

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500';

export function RechargeFlow() {
  const eventId = useAuthStore((s) => s.eventId);
  const queryClient = useQueryClient();

  const [uid, setUid] = useState('');
  const [valor, setValor] = useState('50');
  const [forma, setForma] = useState('pix');
  const [step, setStep] = useState<Step>('form');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const valorNum = Number(valor.replace(',', '.'));
  const valorValido = Number.isFinite(valorNum) && valorNum >= 0.01;
  const isCash = forma === 'dinheiro';

  const { data: cardStatus } = useQuery({
    queryKey: ['card-status', uid],
    queryFn: async () => {
      const { data } = await api.get(`/cards/${uid}/status`);
      return data;
    },
    enabled: uid.trim().length >= 4,
    retry: false,
  });

  // Consulta periódica do pagamento enquanto aguarda o cliente
  const { data: polled } = useQuery({
    queryKey: ['payment-intent', intent?.id],
    queryFn: async () => {
      const { data } = await api.get<PaymentIntent>(`/payments/${intent!.id}`);
      return data;
    },
    enabled: step === 'awaiting' && !!intent?.id,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (step !== 'awaiting' || !polled) return;
    if (polled.status === 'approved') {
      setIntent((prev) => (prev ? { ...prev, ...polled } : polled));
      setStep('approved');
    } else if (['declined', 'expired', 'cancelled'].includes(polled.status)) {
      setError(`Pagamento ${labelStatus(polled.status).toLowerCase()}. Gere uma nova cobrança.`);
      setStep('form');
      setIntent(null);
    }
  }, [polled, step]);

  function reset() {
    setStep('form');
    setIntent(null);
    setError('');
    setCopied(false);
  }

  const afterCredit = () => {
    queryClient.invalidateQueries({ queryKey: ['card-status', uid] });
    setStep('done');
  };

  const cashMutation = useMutation({
    mutationFn: () =>
      api.post(`/cards/${uid}/recharge`, {
        valor: valorNum,
        forma_pagamento: 'dinheiro',
        event_id: eventId ?? undefined,
      }),
    onSuccess: afterCredit,
    onError: (err) => setError(getErrorMessage(err, 'Falha ao creditar recarga')),
  });

  const intentMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<PaymentIntent>(
        `/cards/${uid}/recharge/intent`,
        { valor: valorNum, forma_pagamento: forma },
      );
      return data;
    },
    onSuccess: (data) => {
      setIntent(data);
      setStep('awaiting');
    },
    onError: (err) => setError(getErrorMessage(err, 'Falha ao gerar cobrança')),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<PaymentIntent>(
        `/payments/${intent!.id}/confirm`,
        {},
      );
      return data;
    },
    onSuccess: (data) => {
      setIntent((prev) => (prev ? { ...prev, ...data } : data));
      setStep('approved');
    },
    onError: (err) => setError(getErrorMessage(err, 'Falha ao confirmar pagamento')),
  });

  const creditMutation = useMutation({
    mutationFn: () =>
      api.post(`/cards/${uid}/recharge`, {
        valor: intent?.valor ?? valorNum,
        forma_pagamento: forma,
        payment_intent_id: intent!.id,
        event_id: eventId ?? undefined,
      }),
    onSuccess: afterCredit,
    onError: (err) => setError(getErrorMessage(err, 'Falha ao creditar recarga')),
  });

  function submit() {
    setError('');
    if (isCash) cashMutation.mutate();
    else intentMutation.mutate();
  }

  async function copyPix() {
    if (!intent?.pix_copia_cola) return;
    try {
      await navigator.clipboard.writeText(intent.pix_copia_cola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const qrIsImage = !!intent?.qr_payload && /^(data:image|https?:\/\/)/.test(intent.qr_payload);
  const busy = cashMutation.isPending || intentMutation.isPending;
  const cardBlocked = !!cardStatus && cardStatus.status !== 'active';

  return (
    <div className="max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6">
      <label className="text-sm text-slate-300">UID da Pulseira</label>
      <input
        value={uid}
        onChange={(e) => setUid(e.target.value.trim())}
        disabled={step !== 'form'}
        placeholder="Aproxime ou digite o UID"
        className={`${inputClass} disabled:opacity-60`}
      />

      {cardStatus && (
        <div className="mb-4 rounded-lg bg-slate-800 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Saldo atual</p>
              <p className="text-2xl font-bold">
                <Money value={cardStatus.saldo_disponivel} />
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                cardStatus.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-red-500/15 text-red-300'
              }`}
            >
              {labelStatus(cardStatus.status)}
            </span>
          </div>
          {cardStatus.nome_cliente && (
            <p className="mt-1 text-sm text-slate-400">{cardStatus.nome_cliente}</p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 'form' && (
        <>
          <label className="text-sm text-slate-300">Valor da Recarga</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={`${inputClass} !mb-2`}
          />
          <div className="mb-4 flex flex-wrap gap-2">
            {QUICK_VALUES.map((v) => (
              <Button
                key={v}
                size="sm"
                variant="ghost"
                onClick={() => setValor(String(v))}
              >
                {formatBRL(v)}
              </Button>
            ))}
          </div>

          <label className="text-sm text-slate-300">Forma de Pagamento</label>
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className={`${inputClass} !mb-6`}
          >
            {FORMAS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {isCash && (
            <p className="mb-4 text-xs text-slate-400">
              Recebimento em dinheiro exige caixa aberto. O saldo é creditado
              imediatamente.
            </p>
          )}

          <Button
            variant="success"
            fullWidth
            onClick={submit}
            loading={busy}
            disabled={!uid || !valorValido || cardBlocked}
          >
            {isCash
              ? `Receber ${formatBRL(valorNum)} e creditar`
              : `Gerar cobrança de ${formatBRL(valorNum)}`}
          </Button>
        </>
      )}

      {step === 'awaiting' && intent && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200">
              Aguardando pagamento de{' '}
              <span className="font-bold">{formatBRL(intent.valor)}</span>{' '}
              ({labelStatus(intent.status)})
            </p>
            {intent.mensagem && (
              <p className="mt-1 text-xs text-slate-400">{intent.mensagem}</p>
            )}
          </div>

          {forma === 'pix' && (
            <div className="space-y-3">
              {qrIsImage ? (
                <img
                  src={intent.qr_payload!}
                  alt="QR Code PIX"
                  className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
                />
              ) : (
                intent.qr_payload && (
                  <div>
                    <p className="mb-1 text-xs text-slate-400">Código do QR PIX</p>
                    <p className="break-all rounded-lg bg-slate-800 p-3 font-mono text-xs text-slate-300">
                      {intent.qr_payload}
                    </p>
                  </div>
                )
              )}
              {intent.pix_copia_cola && (
                <div>
                  <p className="mb-1 text-xs text-slate-400">PIX copia e cola</p>
                  <p className="break-all rounded-lg bg-slate-800 p-3 font-mono text-xs text-slate-300">
                    {intent.pix_copia_cola}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 inline-flex items-center gap-2"
                    onClick={copyPix}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar código'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {forma !== 'pix' && (
            <p className="rounded-lg bg-slate-800 p-4 text-sm text-slate-200">
              {intent.softpos_instruction ||
                'Aproxime o cartão do cliente na maquininha para concluir o pagamento.'}
            </p>
          )}

          {intent.demo_mode && (
            <div className="rounded-lg border border-slate-700 p-3">
              <p className="mb-2 text-xs text-slate-400">
                Ambiente de demonstração: nenhum pagamento real será processado.
              </p>
              <Button
                variant="secondary"
                fullWidth
                loading={confirmMutation.isPending}
                onClick={() => {
                  setError('');
                  confirmMutation.mutate();
                }}
              >
                Confirmar pagamento (demo)
              </Button>
            </div>
          )}

          <Button variant="ghost" fullWidth onClick={reset}>
            Cancelar
          </Button>
        </div>
      )}

      {step === 'approved' && intent && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Pagamento aprovado: {formatBRL(intent.valor)}. Falta creditar o saldo
            na pulseira.
          </div>
          <Button
            variant="success"
            fullWidth
            loading={creditMutation.isPending}
            onClick={() => {
              setError('');
              creditMutation.mutate();
            }}
          >
            Creditar {formatBRL(intent.valor)} na pulseira
          </Button>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Recarga de {formatBRL(intent?.valor ?? valorNum)} realizada com
            sucesso.
          </div>
          <Button variant="primary" fullWidth onClick={reset}>
            Nova recarga
          </Button>
        </div>
      )}
    </div>
  );
}
