import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

export function ReportsPage() {
  const eventId = useAuthStore((s) => s.eventId);

  const { data: sales } = useQuery({
    queryKey: ['sales-report', eventId],
    queryFn: async () => {
      const { data } = await api.get('/reports/sales', { params: { event_id: eventId } });
      return data;
    },
    enabled: !!eventId,
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products-report', eventId],
    queryFn: async () => {
      const { data } = await api.get('/reports/products', { params: { event_id: eventId } });
      return data;
    },
    enabled: !!eventId,
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Relatórios de Vendas</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-slate-400 text-sm">Total de Vendas</p>
          <p className="text-3xl font-bold text-amber-400">
            R$ {Number(sales?.total_vendas ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-slate-400 text-sm">Pedidos Pagos</p>
          <p className="text-3xl font-bold">{sales?.quantidade_pedidos ?? 0}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="font-semibold mb-4">Ranking de Produtos</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800">
              <th className="text-left py-2">Produto</th>
              <th className="text-right py-2">Qtd</th>
              <th className="text-right py-2">Receita</th>
            </tr>
          </thead>
          <tbody>
            {topProducts?.map((p: { nome: string; quantidade: string; receita: string }) => (
              <tr key={p.nome} className="border-b border-slate-800/50">
                <td className="py-2">{p.nome}</td>
                <td className="text-right py-2">{p.quantidade}</td>
                <td className="text-right py-2">R$ {Number(p.receita).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
