export function formatBRL(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

export function formatDateTimeBR(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

export const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  blocked: 'Bloqueado',
  inactive: 'Inativo',
  exited: 'Saiu',
  draft: 'Rascunho',
  closed: 'Encerrado',
  open: 'Aberta',
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  cancelled: 'Cancelado',
  approved: 'Aprovado',
  awaiting_customer: 'Aguardando cliente',
  expired: 'Expirado',
  trial: 'Trial',
  suspended: 'Suspenso',
  prepaid: 'Pré-pago',
  postpaid: 'Pós-pago',
  online: 'Online',
  offline: 'Offline',
};

export function labelStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_LABELS[status] ?? status;
}

export function maskCpf(cpf: string | null | undefined): string {
  const digits = (cpf || '').replace(/\D/g, '');
  if (digits.length !== 11) return cpf || '—';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}
