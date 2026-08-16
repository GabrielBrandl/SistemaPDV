import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCog } from 'lucide-react';
import api from '../services/api';
import { apiErrorMessage } from '../lib/saas-ui';
import type { TeamRole, TeamUser } from '../types/saas';

const ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operador' },
  { value: 'exit', label: 'Saída' },
];

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'operator' as TeamRole,
  telefone: '',
};

export function TeamPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [resetPassword, setResetPassword] = useState<Record<string, string>>(
    {},
  );

  const { data: users, isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => (await api.get('/users')).data as TeamUser[],
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          telefone: form.telefone || undefined,
        })
      ).data,
    onSuccess: () => {
      setForm(emptyForm);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
    },
    onError: (e) => setFormError(apiErrorMessage(e, 'Falha ao criar usuário')),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        name?: string;
        role?: TeamRole;
        ativo?: boolean;
        telefone?: string;
        password?: string;
      };
    }) => (await api.patch(`/users/${id}`, patch)).data,
    onSuccess: (_d, vars) => {
      setResetPassword((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
    },
  });

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Equipe</h2>
        <p className="mt-1 text-sm text-slate-400">
          Gerencie usuários do estabelecimento (admin, operador, saída)
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="rounded-xl border border-slate-800 bg-slate-900 p-5"
      >
        <div className="mb-3 flex items-center gap-2">
          <Plus size={18} className="text-amber-400" />
          <h3 className="font-semibold">Novo usuário</h3>
        </div>
        {formError && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {formError}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Senha (mín. 6)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as TeamRole })
            }
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        {isLoading ? (
          <p className="p-6 text-slate-500">Carregando equipe...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">E-mail</th>
                  <th className="p-3 text-left">Papel</th>
                  <th className="p-3 text-center">Ativo</th>
                  <th className="p-3 text-left">Reset senha</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id} className="border-t border-slate-800">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <UserCog size={14} className="text-slate-500" />
                        {u.name}
                      </div>
                    </td>
                    <td className="p-3 text-slate-400">{u.email}</td>
                    <td className="p-3">
                      <select
                        value={
                          ROLE_OPTIONS.some((r) => r.value === u.role)
                            ? u.role
                            : 'operator'
                        }
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: u.id,
                            patch: { role: e.target.value as TeamRole },
                          })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          updateMutation.mutate({
                            id: u.id,
                            patch: { ativo: !u.ativo },
                          })
                        }
                        className={`rounded-full px-2.5 py-0.5 text-xs ${
                          u.ativo
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Nova senha"
                          value={resetPassword[u.id] ?? ''}
                          onChange={(e) =>
                            setResetPassword({
                              ...resetPassword,
                              [u.id]: e.target.value,
                            })
                          }
                          className="w-32 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          disabled={
                            !resetPassword[u.id] ||
                            resetPassword[u.id].length < 6 ||
                            updateMutation.isPending
                          }
                          onClick={() =>
                            updateMutation.mutate({
                              id: u.id,
                              patch: { password: resetPassword[u.id] },
                            })
                          }
                          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users?.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-500"
                    >
                      Nenhum usuário
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
