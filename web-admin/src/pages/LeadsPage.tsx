import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { formatDateTimeBR } from '../shared/format';

type Lead = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string | null;
  interesse: string;
  mensagem: string | null;
  origem: string;
  status: string;
  criadoEm: string;
};

export function LeadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => (await api.get('/leads')).data as Lead[],
  });

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Leads comerciais</h2>
      <p className="mb-6 text-sm text-slate-400">
        Contatos captados na landing pública.
      </p>
      {isLoading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Quando</th>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Contato</th>
                <th className="px-3 py-2 font-medium">Empresa</th>
                <th className="px-3 py-2 font-medium">Interesse</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((l) => (
                <tr key={l.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-400">
                    {formatDateTimeBR(l.criadoEm)}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-100">
                    {l.nome}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    <div>{l.email}</div>
                    <div className="text-slate-500">{l.telefone}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {l.empresa || '—'}
                  </td>
                  <td className="px-3 py-2 text-amber-300">{l.interesse}</td>
                </tr>
              ))}
              {!data?.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    Nenhum lead ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
