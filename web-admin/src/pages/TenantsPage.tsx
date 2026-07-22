import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

type Tenant = {
  id: string;
  nome: string;
  slug: string;
  cnpj: string | null;
  plano: string;
  status: string;
  criadoEm: string;
};

export function TenantsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setImpersonateTenantId = useAuthStore((s) => s.setImpersonateTenantId);
  const setEventId = useAuthStore((s) => s.setEventId);
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => (await api.get('/tenants')).data as Tenant[],
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/tenants', {
          nome,
          cnpj: cnpj || undefined,
        })
      ).data,
    onSuccess: () => {
      setNome('');
      setCnpj('');
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  async function enterTenant(tenant: Tenant) {
    setImpersonateTenantId(tenant.id);
    const events = await api.get('/events');
    if (events.data.length > 0) {
      setEventId(events.data[0].id);
    } else {
      setEventId('');
    }
    navigate('/');
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Tenants (SaaS)</h2>
      <p className="text-slate-400 text-sm mb-6">
        Gestão dos estabelecimentos clientes da plataforma
      </p>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mb-6">
        <h3 className="font-semibold mb-3">Novo tenant</h3>
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <input
            placeholder="CNPJ"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!nome || createMutation.isPending}
            className="rounded-lg bg-amber-500 text-slate-900 px-4 py-2 font-semibold disabled:opacity-50"
          >
            Criar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Slug</th>
                <th className="text-left p-3">Plano</th>
                <th className="text-center p-3">Status</th>
                <th className="text-center p-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {tenants?.map((t) => (
                <tr key={t.id} className="border-t border-slate-800">
                  <td className="p-3">{t.nome}</td>
                  <td className="p-3 font-mono text-xs">{t.slug}</td>
                  <td className="p-3">{t.plano}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => enterTenant(t)}
                      className="text-amber-400 hover:text-amber-300 text-xs"
                    >
                      Entrar no tenant
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
