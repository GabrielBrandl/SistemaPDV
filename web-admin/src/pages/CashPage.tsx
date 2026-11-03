import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/auth';
import { formatBRL, formatDateTimeBR, labelStatus } from '../shared/format';
import { TerminalShell } from '../components/TerminalShell';
import { Button } from '../components/ui/Button';
import { Money } from '../components/ui/Money';

type CashSession = {
  id: string;
  status: string;
  fundoInicial: number | string;
  totalEntradas: number | string;
  totalSaidas: number | string;
  abertura: string;
};

type CloseResult = CashSession & {
  esperado: number;
  diferenca: number;
  contadoFechamento?: number | string | null;
};

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500';

export function CashPage() {
  const eventId = useAuthStore((s) => s.eventId);
  const queryClient = useQueryClient();
  const [fundo, setFundo] = useState('100');
  const [contado, setContado] = useState('');
  const [error, setError] = useState('');
  const [closed, setClosed] = useState<CloseResult | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['cash-open', eventId],
    queryFn: async () => {
      const { data } = await api.get<CashSession | ''>('/cash/open', {
        params: { event_id: eventId },
      });
      return data || null;
    },
    enabled: !!eventId,
  });

  const openMutation = useMutation({
    mutationFn: () =>
      api.post('/cash/open', {
        event_id: eventId,
        fundo_inicial: Number(fundo.replace(',', '.')),
      }),
    onSuccess: () => {
      setError('');
      setClosed(null);
      queryClient.invalidateQueries({ queryKey: ['cash-open', eventId] });
    },
    onError: (err) => setError(getErrorMessage(err, 'Falha ao abrir caixa')),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CloseResult>(
        `/cash/${session!.id}/close`,
        { contado: Number(contado.replace(',', '.')) },
      );
      return data;
    },
    onSuccess: (data) => {
      setError('');
      setClosed(data);
      setContado('');
      queryClient.invalidateQueries({ queryKey: ['cash-open', eventId] });
    },
    onError: (err) => setError(getErrorMessage(err, 'Falha ao fechar caixa')),
  });

  const fundoNum = Number(fundo.replace(',', '.'));
  const contadoNum = Number(contado.replace(',', '.'));
  const esperado = session
    ? Number(session.fundoInicial) +
      Number(session.totalEntradas) -
      Number(session.totalSaidas)
    : 0;

  return (
    <TerminalShell title="Caixa">
      <div className="max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6">
        {!eventId && (
          <p className="text-sm text-amber-300">
            Nenhum evento selecionado. Faça login novamente para carregar o
            evento ativo.
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {eventId && isLoading && (
          <p className="text-slate-400">Carregando caixa...</p>
        )}

        {eventId && !isLoading && !session && (
          <>
            {closed && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                <p className="font-semibold text-emerald-300">Caixa fechado</p>
                <p className="mt-2 text-slate-300">
                  Esperado: <Money value={closed.esperado} tone="slate" />
                </p>
                <p className="text-slate-300">
                  Contado:{' '}
                  <Money value={closed.contadoFechamento} tone="slate" />
                </p>
                <p className="text-slate-300">
                  Diferença:{' '}
                  <Money
                    value={closed.diferenca}
                    tone={Number(closed.diferenca) === 0 ? 'emerald' : 'red'}
                  />
                </p>
              </div>
            )}

            <h3 className="mb-1 font-semibold">Abrir caixa</h3>
            <p className="mb-4 text-sm text-slate-400">
              Informe o fundo de troco inicial.
            </p>
            <label className="text-sm text-slate-300">Fundo de troco</label>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={fundo}
              onChange={(e) => setFundo(e.target.value)}
              className={inputClass}
            />
            <Button
              fullWidth
              loading={openMutation.isPending}
              disabled={!Number.isFinite(fundoNum) || fundoNum < 0}
              onClick={() => {
                setError('');
                openMutation.mutate();
              }}
            >
              Abrir caixa com {formatBRL(fundoNum)}
            </Button>
          </>
        )}

        {eventId && !isLoading && session && (
          <>
            <div className="mb-4 rounded-lg bg-slate-800 p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-100">
                  Caixa {labelStatus(session.status).toLowerCase()}
                </p>
                <span className="text-xs text-slate-400">
                  desde {formatDateTimeBR(session.abertura)}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <dt>Fundo inicial</dt>
                  <dd>{formatBRL(session.fundoInicial)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Entradas</dt>
                  <dd>{formatBRL(session.totalEntradas)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Saídas</dt>
                  <dd>{formatBRL(session.totalSaidas)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2 font-semibold">
                  <dt>Esperado em caixa</dt>
                  <dd>
                    <Money value={esperado} />
                  </dd>
                </div>
              </dl>
            </div>

            <h3 className="mb-1 font-semibold">Fechar caixa</h3>
            <label className="text-sm text-slate-300">
              Valor contado em dinheiro
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              className={inputClass}
            />
            <Button
              variant="danger"
              fullWidth
              loading={closeMutation.isPending}
              disabled={!contado || !Number.isFinite(contadoNum) || contadoNum < 0}
              onClick={() => {
                setError('');
                closeMutation.mutate();
              }}
            >
              Fechar caixa
            </Button>
          </>
        )}
      </div>
    </TerminalShell>
  );
}
