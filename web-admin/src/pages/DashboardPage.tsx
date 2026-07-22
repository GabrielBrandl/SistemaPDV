import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

export function DashboardPage() {
  const eventId = useAuthStore((s) => s.eventId);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', eventId],
    queryFn: async () => {
      const { data } = await api.get(`/events/${eventId}/dashboard`);
      return data;
    },
    enabled: !!eventId,
    refetchInterval: 5000,
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', eventId],
    queryFn: async () => {
      const { data } = await api.get('/reports/products', { params: { event_id: eventId } });
      return data;
    },
    enabled: !!eventId,
  });

  if (isLoading) return <p className="text-slate-400">Carregando dashboard...</p>;

  const cards = [
    { label: 'Vendas do Dia', value: `R$ ${Number(dashboard?.total_vendas ?? 0).toFixed(2)}` },
    { label: 'Transações', value: dashboard?.num_transacoes ?? 0 },
    { label: 'Cartões Ativos', value: dashboard?.cartoes_ativos ?? 0 },
    {
      label: 'Saldo Circulando',
      value: `R$ ${Number(dashboard?.saldo_total_circulando ?? 0).toFixed(2)}`,
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard do Evento</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold mb-4">Produtos Mais Vendidos</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="nome" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
              />
              <Bar dataKey="quantidade" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
