import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

export function ProductsPage() {
  const eventId = useAuthStore((s) => s.eventId);
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('Bebidas');

  const { data: products } = useQuery({
    queryKey: ['products', eventId],
    queryFn: async () => {
      const { data } = await api.get('/products', { params: { event_id: eventId } });
      return data;
    },
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/products', {
        event_id: eventId,
        nome,
        preco: Number(preco),
        categoria,
      }),
    onSuccess: () => {
      setNome('');
      setPreco('');
      queryClient.invalidateQueries({ queryKey: ['products', eventId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (product: { id: string; ativo: boolean }) =>
      api.patch(`/products/${product.id}`, { ativo: !product.ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', eventId] }),
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Cardápio / Produtos</h2>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mb-6">
        <h3 className="font-semibold mb-4">Novo Produto</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <input
            placeholder="Preço"
            type="number"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2"
          >
            <option>Bebidas</option>
            <option>Comidas</option>
            <option>Combos</option>
          </select>
          <button
            onClick={() => createMutation.mutate()}
            className="rounded-lg bg-amber-500 text-slate-900 font-semibold"
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="text-left p-3">Produto</th>
              <th className="text-left p-3">Categoria</th>
              <th className="text-right p-3">Preço</th>
              <th className="text-center p-3">Status</th>
              <th className="text-center p-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p: { id: string; nome: string; categoria: string; preco: number; ativo: boolean }) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="p-3">{p.nome}</td>
                <td className="p-3 text-slate-400">{p.categoria}</td>
                <td className="p-3 text-right">R$ {Number(p.preco).toFixed(2)}</td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      p.ativo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => toggleMutation.mutate(p)}
                    className="text-amber-400 hover:text-amber-300 text-xs"
                  >
                    {p.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
