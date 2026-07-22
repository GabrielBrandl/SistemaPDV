import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function PdvPage() {
  const { data: terminals } = useQuery({
    queryKey: ['terminals'],
    queryFn: async () => {
      const { data } = await api.get('/pdv/terminals');
      return data;
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Terminais PDV</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {terminals?.map(
          (t: {
            id: string;
            serial: string;
            adquirente: string;
            modelo: string;
            status: string;
            ultimoSync: string;
          }) => (
            <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">{t.serial}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    t.status === 'online'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <p className="text-sm text-slate-400">Adquirente: {t.adquirente ?? '—'}</p>
              <p className="text-sm text-slate-400">Modelo: {t.modelo ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-2">
                Último sync: {t.ultimoSync ? new Date(t.ultimoSync).toLocaleString() : 'Nunca'}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
