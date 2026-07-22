import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

/**
 * SoftPOS / Tap to Phone no celular Android.
 * Providers reais: Stone SoftPOS, PagBank Tap on Phone, Mercado Pago, Cielo SoftPOS.
 * Aqui: contrato + modo demo até plugar o SDK nativo.
 */
@Injectable()
export class SoftPosProvider {
  constructor(private readonly config: ConfigService) {}

  get mode(): 'demo' | 'stone' | 'pagbank' | 'mercadopago' {
    const m = (this.config.get<string>('SOFTPOS_PROVIDER') || 'demo').toLowerCase();
    if (m === 'stone' || m === 'pagbank' || m === 'mercadopago') return m;
    return 'demo';
  }

  createSession(input: {
    valor: number;
    forma: 'debito' | 'credito';
    comandaId: string;
  }) {
    const providerRef = `softpos_${randomBytes(8).toString('hex')}`;
    const instruction =
      this.mode === 'demo'
        ? 'Aproxime o cartão de crédito/débito na parte de trás do celular (NFC). Em modo demo, use "Simular aprovação".'
        : `Inicie o SoftPOS (${this.mode}): aproxime o cartão contactless no NFC do telefone.`;

    return {
      provider: this.mode,
      providerRef,
      instruction,
      amountCents: Math.round(input.valor * 100),
      forma: input.forma,
      // Payload que o app Android/WebView usará com o SDK
      softposRequest: {
        amount: Math.round(input.valor * 100),
        type: input.forma === 'credito' ? 'CREDIT' : 'DEBIT',
        reference: input.comandaId,
        provider: this.mode,
      },
    };
  }
}
