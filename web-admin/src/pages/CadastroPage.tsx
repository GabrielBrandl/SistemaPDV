import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Nfc, Search, UserPlus } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/auth';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

function formatCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

type LookupResult = {
  encontrado: boolean;
  cpf: string;
  cliente?: {
    id: string;
    nome: string;
    cpf: string;
    telefone: string;
  };
};

type BindResult = {
  origem: string;
  mensagem: string;
  cliente: { nome: string; cpf: string; telefone: string };
  cartao: { uid: string; session_token: string };
  comanda: { id: string; numero: number };
};

export function CadastroPage() {
  const eventId = useAuthStore((s) => s.eventId);
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [uid, setUid] = useState('');
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [result, setResult] = useState<BindResult | null>(null);
  const [error, setError] = useState('');
  const [nfcOn, setNfcOn] = useState(false);

  const lookupMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/customers/lookup', {
          cpf: onlyDigits(cpf),
        })
      ).data as LookupResult,
    onSuccess: (data) => {
      setLookup(data);
      setResult(null);
      setError('');
      if (data.encontrado && data.cliente) {
        setNome(data.cliente.nome);
        setTelefone(formatPhone(data.cliente.telefone));
      } else {
        setNome('');
        setTelefone('');
      }
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha ao buscar CPF');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/customers/register', {
          nome: nome.trim(),
          cpf: onlyDigits(cpf),
          telefone: onlyDigits(telefone),
          uid_nfc: uid.trim(),
          event_id: eventId || undefined,
        })
      ).data as BindResult,
    onSuccess: (data) => {
      setResult(data);
      setError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha no cadastro');
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/customers/checkin', {
          cpf: onlyDigits(cpf),
          uid_nfc: uid.trim(),
          event_id: eventId || undefined,
        })
      ).data as BindResult,
    onSuccess: (data) => {
      setResult(data);
      setError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Falha no check-in');
    },
  });

  const onNfcSerial = useCallback((serial: string) => {
    setUid(serial);
  }, []);

  useEffect(() => {
    const NDEFReader = (
      window as unknown as {
        NDEFReader?: new () => {
          scan: () => Promise<void>;
          onreading: ((e: { serialNumber?: string }) => void) | null;
        };
      }
    ).NDEFReader;
    if (!NDEFReader || !nfcOn) return;
    let cancelled = false;
    const reader = new NDEFReader();
    reader.onreading = (event) => {
      if (cancelled) return;
      const serial = (event.serialNumber || '').replace(/:/g, '').toUpperCase();
      if (serial) onNfcSerial(serial);
    };
    reader.scan().catch(() => {
      setError('NFC indisponível neste dispositivo');
      setNfcOn(false);
    });
    return () => {
      cancelled = true;
    };
  }, [nfcOn, onNfcSerial]);

  function reset() {
    setCpf('');
    setNome('');
    setTelefone('');
    setUid('');
    setLookup(null);
    setResult(null);
    setError('');
  }

  const cpfOk = onlyDigits(cpf).length === 11;
  const isReturning = lookup?.encontrado === true;
  const canSubmit =
    cpfOk &&
    uid.trim().length >= 4 &&
    (isReturning || (nome.trim().length >= 2 && onlyDigits(telefone).length >= 8));

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Cadastro / Check-in</h2>
          <p className="text-slate-400 text-sm mt-1">
            Nome, CPF e telefone · cartão NFC vira o token da comanda
          </p>
        </div>
        <Link to="/pos" className="text-sm text-amber-400 hover:text-amber-300">
          Ir ao PDV
        </Link>
      </div>

      {result ? (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400" size={32} />
            <div>
              <p className="text-xl font-bold">{result.mensagem}</p>
              <p className="text-sm text-slate-300">
                Comanda #{result.comanda.numero} aberta
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-black/20 p-4 text-sm space-y-1">
            <p>
              <span className="text-slate-400">Cliente:</span> {result.cliente.nome}
            </p>
            <p>
              <span className="text-slate-400">CPF:</span> {formatCpf(result.cliente.cpf)}
            </p>
            <p>
              <span className="text-slate-400">Cartão:</span>{' '}
              <span className="font-mono">{result.cartao.uid}</span>
            </p>
            <p className="break-all">
              <span className="text-slate-400">Token:</span>{' '}
              <span className="font-mono text-xs">{result.cartao.session_token}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/pos"
              className="flex-1 text-center rounded-xl bg-amber-500 text-slate-900 font-bold py-3"
            >
              Lançar pedidos no PDV
            </Link>
            <button
              onClick={reset}
              className="rounded-xl border border-slate-600 px-4 py-3 text-sm"
            >
              Próximo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-400">CPF</label>
              <div className="flex gap-2 mt-1">
                <input
                  value={cpf}
                  onChange={(e) => {
                    setCpf(formatCpf(e.target.value));
                    setLookup(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && cpfOk && lookupMutation.mutate()}
                  placeholder="000.000.000-00"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-lg"
                />
                <button
                  onClick={() => lookupMutation.mutate()}
                  disabled={!cpfOk || lookupMutation.isPending}
                  className="rounded-xl bg-amber-500 text-slate-900 px-4 font-bold disabled:opacity-40 inline-flex items-center gap-2"
                >
                  <Search size={18} />
                  Buscar
                </button>
              </div>
            </div>

            {lookup && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  lookup.encontrado
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
                }`}
              >
                {lookup.encontrado
                  ? `Cliente encontrado: ${lookup.cliente?.nome}. Aproxime o cartão para check-in.`
                  : 'CPF novo — preencha nome, telefone e aproxime o cartão.'}
              </div>
            )}

            {lookup && (
              <>
                <div>
                  <label className="text-xs text-slate-400">Nome</label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    disabled={isReturning}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 disabled:opacity-60"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Telefone</label>
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    disabled={isReturning}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 disabled:opacity-60"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Cartão NFC (UID)</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      value={uid}
                      onChange={(e) => setUid(e.target.value.toUpperCase())}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-mono"
                      placeholder="Aproxime ou digite o UID"
                    />
                    <button
                      type="button"
                      onClick={() => setNfcOn((v) => !v)}
                      className={`rounded-xl px-3 ${
                        nfcOn ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
                      }`}
                    >
                      <Nfc size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Demo: 04A3B2112233
                  </p>
                </div>

                <button
                  onClick={() =>
                    isReturning ? checkinMutation.mutate() : registerMutation.mutate()
                  }
                  disabled={
                    !canSubmit ||
                    registerMutation.isPending ||
                    checkinMutation.isPending
                  }
                  className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 text-lg disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  <UserPlus size={20} />
                  {isReturning
                    ? 'Check-in e abrir comanda'
                    : 'Cadastrar, vincular cartão e abrir'}
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 text-sm">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
