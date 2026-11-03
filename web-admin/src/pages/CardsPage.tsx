import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../services/api';
import { useAuthStore } from '../store/auth';
import { labelStatus } from '../shared/format';
import { Button } from '../components/ui/Button';
import { Money } from '../components/ui/Money';

export function CardsPage() {
  const eventId = useAuthStore((s) => s.eventId);
  const queryClient = useQueryClient();
  const [uid, setUid] = useState('');
  const [nome, setNome] = useState('');
  const [searchUid, setSearchUid] = useState('04A3B2112233');

  const { data: cardStatus } = useQuery({
    queryKey: ['card-status', searchUid],
    queryFn: async () => {
      const { data } = await api.get(`/cards/${searchUid}/status`);
      return data;
    },
    enabled: !!searchUid,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/cards', {
        uid_nfc: uid,
        event_id: eventId,
        cliente_nome: nome,
        saldo_inicial: 0,
      }),
    onSuccess: () => {
      setUid('');
      setNome('');
      queryClient.invalidateQueries({ queryKey: ['card-status'] });
    },
  });

  const [actionError, setActionError] = useState('');

  const statusMutation = useMutation({
    mutationFn: (action: 'block' | 'unblock') =>
      api.post(`/cards/${searchUid}/${action}`),
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['card-status', searchUid] });
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, 'Falha ao alterar status do cartão')),
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Gestão de Cartões NFC</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold mb-4">Vincular Nova Pulseira</h3>
          <input
            placeholder="UID NFC (ex: 04A3B2112233)"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mb-3"
          />
          <input
            placeholder="Nome do cliente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mb-4"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!uid || !eventId}
            className="rounded-lg bg-amber-500 text-slate-900 px-4 py-2 font-semibold disabled:opacity-50"
          >
            Vincular Cartão
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold mb-4">Consultar Cartão</h3>
          <div className="flex gap-2 mb-4">
            <input
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
            />
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['card-status', searchUid] })}
              className="rounded-lg bg-slate-700 px-4 py-2"
            >
              Buscar
            </button>
          </div>
          {cardStatus && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-400">UID:</span> {cardStatus.uid}
              </p>
              <p>
                <span className="text-slate-400">Cliente:</span>{' '}
                {cardStatus.nome_cliente ?? '—'}
              </p>
              <p>
                <span className="text-slate-400">Status:</span>{' '}
                {labelStatus(cardStatus.status)}
              </p>
              <p className="text-lg font-bold">
                <span className="text-amber-400">Saldo: </span>
                <Money value={cardStatus.saldo_disponivel} />
              </p>
              {actionError && (
                <p className="text-sm text-red-300">{actionError}</p>
              )}
              <div className="flex gap-2 pt-2">
                {cardStatus.status === 'blocked' ? (
                  <Button
                    variant="success"
                    size="sm"
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate('unblock')}
                  >
                    Desbloquear
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={statusMutation.isPending}
                    disabled={cardStatus.status !== 'active'}
                    onClick={() => statusMutation.mutate('block')}
                  >
                    Bloquear
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
