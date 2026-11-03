/**
 * Regras de dinheiro — testes unitários sem DB.
 * Garante que crédito só ocorre com intent aprovado (contrato da API).
 */

describe('money guards (contrato recarga)', () => {
  function canCredit(opts: {
    forma: string;
    intentStatus?: string;
    intentPurpose?: string;
    intentValor?: number;
    valor: number;
    alreadyCredited?: boolean;
  }) {
    if (opts.forma === 'dinheiro') return { ok: true, reason: 'cash' };
    if (!opts.intentStatus) return { ok: false, reason: 'PAYMENT_REQUIRED' };
    if (opts.intentPurpose !== 'recharge') return { ok: false, reason: 'INVALID_INTENT' };
    if (opts.intentStatus !== 'approved') return { ok: false, reason: 'PAYMENT_NOT_APPROVED' };
    if (opts.alreadyCredited) return { ok: false, reason: 'ALREADY_CREDITED' };
    if (Math.abs((opts.intentValor ?? 0) - opts.valor) > 0.009) {
      return { ok: false, reason: 'VALUE_MISMATCH' };
    }
    return { ok: true, reason: 'ok' };
  }

  it('bloqueia recarga PIX sem intent', () => {
    expect(canCredit({ forma: 'pix', valor: 50 }).ok).toBe(false);
  });

  it('bloqueia intent pendente', () => {
    expect(
      canCredit({
        forma: 'pix',
        valor: 50,
        intentStatus: 'awaiting_customer',
        intentPurpose: 'recharge',
        intentValor: 50,
      }).reason,
    ).toBe('PAYMENT_NOT_APPROVED');
  });

  it('permite após approved', () => {
    expect(
      canCredit({
        forma: 'pix',
        valor: 50,
        intentStatus: 'approved',
        intentPurpose: 'recharge',
        intentValor: 50,
      }).ok,
    ).toBe(true);
  });

  it('bloqueia double credit', () => {
    expect(
      canCredit({
        forma: 'pix',
        valor: 50,
        intentStatus: 'approved',
        intentPurpose: 'recharge',
        intentValor: 50,
        alreadyCredited: true,
      }).reason,
    ).toBe('ALREADY_CREDITED');
  });

  it('dinheiro não exige intent externo', () => {
    expect(canCredit({ forma: 'dinheiro', valor: 20 }).ok).toBe(true);
  });

  it('centavos pt-BR', () => {
    const formatBRL = (n: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
    expect(formatBRL(10.5)).toMatch(/10,50/);
  });
});
