import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/auth';
import { formatBrl } from '../lib/saas-ui';
import type { PlanDefinition } from '../types/saas';

export function PlansPage() {
  const token = useAuthStore((s) => s.token);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => (await api.get('/plans')).data as PlanDefinition[],
  });

  return (
    <div
      className={
        token
          ? 'space-y-6'
          : 'min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-4 py-10'
      }
    >
      <div className={token ? '' : 'mx-auto max-w-6xl'}>
        <div className={token ? '' : 'mb-10 text-center'}>
          {!token && (
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/80">
              PDV Cashless
            </p>
          )}
          <h1
            className={`font-bold text-slate-50 ${
              token ? 'text-2xl' : 'mt-2 text-3xl md:text-4xl'
            }`}
          >
            Planos e preços
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400 md:mx-auto">
            Do teste cashless ao festival multi-evento. Todos os planos incluem
            PDV comanda NFC e controle de saída.
          </p>
          {!token && (
            <p className="mt-4 text-sm text-slate-500">
              Já tem conta?{' '}
              <Link to="/login" className="text-amber-400">
                Entrar
              </Link>
            </p>
          )}
        </div>

        {isLoading ? (
          <p className="text-slate-400">Carregando planos...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans?.map((p) => (
              <article
                key={p.id}
                className={`flex flex-col rounded-2xl border p-5 ${
                  p.destaque
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-900/20'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                {p.destaque && (
                  <span className="mb-2 w-fit rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900">
                    Mais popular
                  </span>
                )}
                <h2 className="text-xl font-semibold text-amber-300">
                  {p.nome}
                </h2>
                <p className="mt-1 min-h-[2.5rem] text-sm text-slate-400">
                  {p.descricao}
                </p>
                <p className="mt-4 text-3xl font-bold text-slate-50">
                  {p.preco_mensal === 0 ? 'Grátis' : formatBrl(p.preco_mensal)}
                  {p.preco_mensal > 0 && (
                    <span className="text-sm font-normal text-slate-500">
                      /mês
                    </span>
                  )}
                </p>
                {p.preco_anual > 0 && (
                  <p className="text-xs text-slate-500">
                    ou {formatBrl(p.preco_anual)}/ano
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Trial {p.trial_dias} dias · até {p.limites.max_terminais}{' '}
                  terminais
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.recursos.map((r) => (
                    <li
                      key={r}
                      className="flex items-start gap-2 text-sm text-slate-300"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-amber-400"
                      />
                      {r}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/onboard?plano=${p.id}`}
                  className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                    p.destaque
                      ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                      : 'border border-slate-700 text-slate-200 hover:border-amber-500/50 hover:text-amber-300'
                  }`}
                >
                  Criar conta
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
