import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

type Integration = {
  id: string;
  nome: string;
  tipo: string;
  apiKey: string;
  webhookUrl: string | null;
  ativo: boolean;
};

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('webhook');
  const [webhook, setWebhook] = useState('');
  const [createdKey, setCreatedKey] = useState('');

  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => (await api.get('/integrations')).data as Integration[],
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/integrations', {
          nome,
          tipo,
          webhook_url: webhook || undefined,
        })
      ).data,
    onSuccess: (data) => {
      setCreatedKey(data.apiKey);
      setNome('');
      setWebhook('');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/integrations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Integrações / APIs</h2>
      <p className="text-slate-400 text-sm mb-6">
        Conecte sistemas externos via API Key e webhooks (eventos de comanda, pagamento, NFC)
      </p>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mb-6 max-w-2xl">
        <h3 className="font-semibold mb-3">Nova integração</h3>
        <div className="space-y-3">
          <input
            placeholder="Nome (ex: ERP, CRM, Zapier)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          >
            <option value="webhook">Webhook</option>
            <option value="erp">ERP</option>
            <option value="crm">CRM</option>
            <option value="custom">Custom API</option>
          </select>
          <input
            placeholder="Webhook URL (opcional)"
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!nome || createMutation.isPending}
            className="rounded-lg bg-amber-500 text-slate-900 px-4 py-2 font-semibold disabled:opacity-50"
          >
            Gerar API Key
          </button>
        </div>
        {createdKey && (
          <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm">
            <p className="text-emerald-300 mb-1">API Key gerada (salve agora):</p>
            <code className="break-all text-xs text-emerald-200">{createdKey}</code>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">API Key</th>
              <th className="text-left p-3">Webhook</th>
              <th className="text-center p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {integrations?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Nenhuma integração cadastrada
                </td>
              </tr>
            )}
            {integrations?.map((i) => (
              <tr key={i.id} className="border-t border-slate-800">
                <td className="p-3">{i.nome}</td>
                <td className="p-3">{i.tipo}</td>
                <td className="p-3 font-mono text-xs">{i.apiKey.slice(0, 16)}...</td>
                <td className="p-3 text-xs truncate max-w-[180px]">{i.webhookUrl || '—'}</td>
                <td className="p-3 text-center">
                  {i.ativo && (
                    <button
                      onClick={() => deactivateMutation.mutate(i.id)}
                      className="text-red-400 text-xs"
                    >
                      Desativar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-slate-500 max-w-2xl space-y-1">
        <p>Eventos enviados ao webhook:</p>
        <p>
          <code>comanda.opened</code>, <code>comanda.nfc_tap</code>,{' '}
          <code>comanda.items_added</code>, <code>comanda.closed</code>,{' '}
          <code>comanda.payment</code>, <code>comanda.paid</code>
        </p>
        <p>
          Header de autenticação nas chamadas à API: <code>X-API-Key: sua_chave</code>
        </p>
      </div>
    </div>
  );
}
