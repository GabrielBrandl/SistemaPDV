import type { InvoiceStatusId, TenantStatusId } from '../types/saas';

export function formatBrl(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
}

export function statusBadgeClass(status: TenantStatusId | string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'trial':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    case 'suspended':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'cancelled':
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

export function invoiceBadgeClass(status: InvoiceStatusId | string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'pending':
      return 'bg-amber-500/20 text-amber-300';
    case 'overdue':
      return 'bg-red-500/20 text-red-300';
    case 'cancelled':
      return 'bg-slate-500/20 text-slate-400';
    default:
      return 'bg-slate-500/20 text-slate-300';
  }
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (
    err as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

export const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Ativo' },
  { value: 'suspended', label: 'Suspenso' },
  { value: 'cancelled', label: 'Cancelado' },
] as const;
