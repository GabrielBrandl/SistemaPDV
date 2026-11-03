import { formatBRL } from '../../shared/format';

/** Valor monetário formatado em BRL, no destaque âmbar do sistema */
export function Money({
  value,
  className = '',
  tone = 'amber',
}: {
  value: number | string | null | undefined;
  className?: string;
  tone?: 'amber' | 'emerald' | 'red' | 'slate';
}) {
  const color = {
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    slate: 'text-slate-200',
  }[tone];
  return <span className={`${color} ${className}`}>{formatBRL(value)}</span>;
}
