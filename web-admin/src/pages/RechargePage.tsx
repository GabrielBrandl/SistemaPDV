import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function RechargePage() {
  const [uid, setUid] = useState('04A3B2112233');
  const [valor, setValor] = useState('50');
  const [forma, setForma] = useState('pix');
  const queryClient = useQueryClient();

  const { data: cardStatus } = useQuery({
    queryKey: ['card-status', uid],
    queryFn: async () => {
      const { data } = await api.get(`/cards/${uid}/status`);
      return data;
    },
    enabled: !!uid,
  });

  const rechargeMutation = useMutation({
    mutationFn: () =>
      api.post(`/cards/${uid}/recharge`, {
        valor: Number(valor),
        forma_pagamento: forma,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-status', uid] });
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Totem de Recarga</h2>
      <div className="max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-slate-400 text-sm mb-4">
          Simule a recarga de saldo em uma pulseira NFC
        </p>

        <label className="text-sm text-slate-300">UID da Pulseira</label>
        <input
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1 mb-4"
        />

        {cardStatus && (
          <div className="rounded-lg bg-slate-800 p-4 mb-4">
            <p className="text-sm text-slate-400">Saldo atual</p>
            <p className="text-2xl font-bold text-amber-400">
              R$ {Number(cardStatus.saldo_disponivel).toFixed(2)}
            </p>
          </div>
        )}

        <label className="text-sm text-slate-300">Valor da Recarga (R$)</label>
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1 mb-4"
        />

        <label className="text-sm text-slate-300">Forma de Pagamento</label>
        <select
          value={forma}
          onChange={(e) => setForma(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 mt-1 mb-6"
        >
          <option value="pix">PIX</option>
          <option value="cartao_credito">Cartão Crédito</option>
          <option value="cartao_debito">Cartão Débito</option>
          <option value="dinheiro">Dinheiro</option>
        </select>

        <button
          onClick={() => rechargeMutation.mutate()}
          disabled={rechargeMutation.isPending}
          className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold py-2.5"
        >
          {rechargeMutation.isPending ? 'Processando...' : 'Confirmar Recarga'}
        </button>

        {rechargeMutation.isSuccess && (
          <p className="mt-4 text-emerald-400 text-sm">Recarga realizada com sucesso!</p>
        )}
      </div>
    </div>
  );
}
