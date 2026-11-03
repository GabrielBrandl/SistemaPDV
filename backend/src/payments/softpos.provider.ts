import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

export type SoftPosMode =
  | 'demo'
  | 'stone'
  | 'pagbank'
  | 'mercadopago'
  | 'cielo';

/**
 * Contrato de pagamento no terminal.
 * PagBank: PlugPag nativo.
 * Cielo Smart: Deep Link lio://payment (sem SDK legado).
 * Mercado Pago Point: order API (/v1/orders type=point) + app no terminal.
 */
@Injectable()
export class SoftPosProvider {
  constructor(private readonly config: ConfigService) {}

  get mode(): SoftPosMode {
    return this.resolve(this.config.get<string>('SOFTPOS_PROVIDER'));
  }

  get cieloReady() {
    return !!(
      this.config.get<string>('CIELO_CLIENT_ID') &&
      this.config.get<string>('CIELO_ACCESS_TOKEN')
    );
  }

  get mercadoPagoReady() {
    return !!(
      this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN') &&
      this.config.get<string>('MERCADOPAGO_TERMINAL_ID')
    );
  }

  resolve(override?: string | null): SoftPosMode {
    const m = (override || this.config.get<string>('SOFTPOS_PROVIDER') || 'demo').toLowerCase();
    if (
      m === 'stone' ||
      m === 'pagbank' ||
      m === 'mercadopago' ||
      m === 'cielo'
    ) {
      return m;
    }
    return 'demo';
  }

  async createSession(input: {
    valor: number;
    forma: 'debito' | 'credito';
    comandaId: string;
    provider?: string;
  }) {
    const mode = this.resolve(input.provider);
    const amountCents = Math.round(input.valor * 100);
    const instruction = this.instructionFor(input.forma, mode);

    let providerRef = `softpos_${randomBytes(8).toString('hex')}`;
    let mpOrder: Record<string, unknown> | null = null;

    if (mode === 'mercadopago') {
      mpOrder = await this.createMercadoPagoPointOrder(input, amountCents);
      if (mpOrder?.id) providerRef = String(mpOrder.id);
    }

    return {
      provider: mode,
      providerRef,
      instruction,
      amountCents,
      forma: input.forma,
      softposRequest: {
        amount: amountCents,
        type: input.forma === 'credito' ? 'CREDIT' : 'DEBIT',
        reference: input.comandaId,
        provider: mode,
        terminal: this.terminalId(mode),
        cielo: mode === 'cielo' ? this.cieloPayload(input, amountCents) : null,
        mercadopago:
          mode === 'mercadopago'
            ? {
                amount_cents: amountCents,
                type: input.forma,
                order_id: mpOrder?.id ?? null,
                terminal_id: this.config.get<string>('MERCADOPAGO_TERMINAL_ID') || null,
              }
            : null,
      },
    };
  }

  async checkMercadoPagoOrder(
    orderId: string,
  ): Promise<{ paid: boolean; status: string; paymentId?: string } | null> {
    const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!token || !orderId.startsWith('ORD')) return null;
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        id?: string;
        status?: string;
        transactions?: { payments?: { id?: string; status?: string }[] };
      };
      const status = (data.status || '').toLowerCase();
      const pay = data.transactions?.payments?.[0];
      const paid = status === 'processed' || pay?.status === 'processed';
      return { paid, status, paymentId: pay?.id };
    } catch {
      return null;
    }
  }

  async cancelMercadoPagoOrder(orderId: string) {
    const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!token || !orderId.startsWith('ORD')) return;
    try {
      await fetch(`https://api.mercadopago.com/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `cancel-${orderId}`,
          'x-allow-cancelable-status': 'at_terminal',
        },
      });
    } catch {
      /* homologação: ignore */
    }
  }

  private async createMercadoPagoPointOrder(
    input: { valor: number; forma: 'debito' | 'credito'; comandaId: string },
    amountCents: number,
  ): Promise<Record<string, unknown> | null> {
    const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    const terminalId = this.config.get<string>('MERCADOPAGO_TERMINAL_ID');
    if (!token || !terminalId) return null;

    const amount = (amountCents / 100).toFixed(2);
    const defaultType = input.forma === 'credito' ? 'credit_card' : 'debit_card';

    try {
      const res = await fetch('https://api.mercadopago.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': input.comandaId,
        },
        body: JSON.stringify({
          type: 'point',
          external_reference: input.comandaId.replace(/-/g, '').slice(0, 64),
          expiration_time: 'PT10M',
          description: `Comanda ${input.comandaId.slice(0, 8)}`,
          transactions: { payments: [{ amount }] },
          config: {
            point: {
              terminal_id: terminalId,
              print_on_terminal: 'seller_ticket',
            },
            payment_method: { default_type: defaultType },
          },
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private terminalId(mode: SoftPosMode = this.mode) {
    switch (mode) {
      case 'pagbank':
        return 'pagbank_smartpos';
      case 'cielo':
        return 'cielo_smart';
      case 'mercadopago':
        return this.config.get<string>('MERCADOPAGO_TERMINAL_ID') || 'mp_point';
      default:
        return 'phone';
    }
  }

  private instructionFor(forma: 'debito' | 'credito', mode: SoftPosMode = this.mode) {
    switch (mode) {
      case 'pagbank':
        return 'PagBank SmartPOS: o app abre o PlugPag no terminal. Aproxime, insira ou pague PIX na Moderninha.';
      case 'cielo':
        return 'Cielo Smart: o app abre o pagamento via Deep Link (lio://). Confirme débito/crédito/PIX na LIO.';
      case 'mercadopago':
        return 'Mercado Pago Point: a cobrança aparece no terminal. O cliente aproxima o cartão ou paga PIX.';
      case 'demo':
        return 'Modo demo: use o app Android (flavor demo) ou simule no painel web.';
      default:
        return `SoftPOS (${this.mode}): aproxime o cartão (${forma}).`;
    }
  }

  private cieloPayload(
    input: { valor: number; forma: 'debito' | 'credito'; comandaId: string },
    amountCents: number,
  ) {
    return {
      scheme: 'lio',
      host: 'payment',
      callback: 'order://response',
      paymentCode:
        input.forma === 'credito' ? 'CREDITO_AVISTA' : 'DEBITO_AVISTA',
      value: String(amountCents),
      reference: input.comandaId,
      clientID: this.config.get<string>('CIELO_CLIENT_ID') || '',
      accessToken: this.config.get<string>('CIELO_ACCESS_TOKEN') || '',
    };
  }
}
