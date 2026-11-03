import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class PixProvider {
  constructor(private readonly config: ConfigService) {}

  get mode(): 'demo' | 'mercadopago' | 'pagbank' | 'cielo' {
    return this.resolve(this.config.get<string>('PIX_PROVIDER'));
  }

  resolve(override?: string | null): 'demo' | 'mercadopago' | 'pagbank' | 'cielo' {
    const m = (override || this.config.get<string>('PIX_PROVIDER') || 'demo').toLowerCase();
    if (m === 'mercadopago' || m === 'pagbank' || m === 'cielo') return m;
    return 'demo';
  }

  /**
   * Gera payload PIX (copia-e-cola).
   * Em demo: BR Code sintético válido para exibir QR.
   * Com provedor real: trocar por chamada à API (MP/PagBank).
   */
  async createCharge(input: {
    valor: number;
    comandaId: string;
    descricao: string;
    provider?: string;
  }): Promise<{
    provider: string;
    providerRef: string;
    copiaCola: string;
    qrPayload: string;
    expiresAt: Date;
  }> {
    const providerRef = `pix_${randomBytes(8).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const mode = this.resolve(input.provider);

    if (mode === 'mercadopago') {
      const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
      if (token) {
        try {
          const created = await this.createMercadoPagoPix(token, input);
          if (created) return created;
        } catch {
          /* cai no BR Code local se a API falhar (homologação) */
        }
      }
    }

    const copiaCola = this.buildDemoEmv({
      valor: input.valor,
      txid: providerRef.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25),
      nome: this.config.get('PIX_RECEBEDOR_NOME') || 'PDV CASHLESS',
      cidade: this.config.get('PIX_RECEBEDOR_CIDADE') || 'SAO PAULO',
      chave: this.config.get('PIX_CHAVE') || '00000000000',
    });

    return {
      provider: mode,
      providerRef,
      copiaCola,
      qrPayload: copiaCola,
      expiresAt,
    };
  }

  private async createMercadoPagoPix(
    token: string,
    input: { valor: number; comandaId: string; descricao: string },
  ) {
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.comandaId,
      },
      body: JSON.stringify({
        transaction_amount: Number(input.valor.toFixed(2)),
        description: input.descricao.slice(0, 120),
        payment_method_id: 'pix',
        payer: { email: 'cliente@pdv.local' },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id?: number;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string };
      };
    };
    const copiaCola = data.point_of_interaction?.transaction_data?.qr_code;
    if (!copiaCola || !data.id) return null;
    return {
      provider: 'mercadopago' as const,
      providerRef: String(data.id),
      copiaCola,
      qrPayload: copiaCola,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  /** Monta EMV QR Code estático/dinâmico simplificado (demo/homologação visual) */
  private buildDemoEmv(opts: {
    valor: number;
    txid: string;
    nome: string;
    cidade: string;
    chave: string;
  }) {
    const tlv = (id: string, value: string) => {
      const len = String(value.length).padStart(2, '0');
      return `${id}${len}${value}`;
    };

    const gui = tlv('00', 'br.gov.bcb.pix') + tlv('01', opts.chave);
    const merchantAccount = tlv('26', gui);
    const amount = opts.valor.toFixed(2);
    const nome = opts.nome.slice(0, 25);
    const cidade = opts.cidade.slice(0, 15);
    const additional = tlv('05', opts.txid.slice(0, 25));

    const payload =
      tlv('00', '01') +
      tlv('01', '12') +
      merchantAccount +
      tlv('52', '0000') +
      tlv('53', '986') +
      tlv('54', amount) +
      tlv('58', 'BR') +
      tlv('59', nome) +
      tlv('60', cidade) +
      tlv('62', additional) +
      '6304';

    const crc = this.crc16(payload).toUpperCase();
    return payload + crc;
  }

  private crc16(payload: string) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
        else crc <<= 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).padStart(4, '0');
  }

  hashWebhook(body: string, secret: string) {
    return createHash('sha256').update(`${secret}.${body}`).digest('hex');
  }
}
