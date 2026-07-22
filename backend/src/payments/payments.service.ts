import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Comanda,
  ComandaStatus,
  PaymentIntent,
  PaymentIntentChannel,
  PaymentIntentStatus,
  PaymentMethod,
} from '../database/entities';
import { ComandasService } from '../comandas/comandas.service';
import { PixProvider } from './pix.provider';
import { SoftPosProvider } from './softpos.provider';
import {
  ConfirmPaymentDto,
  CreateCardPaymentDto,
  CreatePixPaymentDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentIntent)
    private readonly intentsRepo: Repository<PaymentIntent>,
    @InjectRepository(Comanda)
    private readonly comandasRepo: Repository<Comanda>,
    private readonly comandasService: ComandasService,
    private readonly pix: PixProvider,
    private readonly softpos: SoftPosProvider,
  ) {}

  private serialize(intent: PaymentIntent) {
    return {
      id: intent.id,
      comanda_id: intent.comandaId,
      channel: intent.channel,
      forma: intent.forma,
      valor: Number(intent.valor),
      status: intent.status,
      provider: intent.provider,
      provider_ref: intent.providerRef,
      pix_copia_cola: intent.pixCopiaCola,
      qr_payload: intent.qrPayload,
      softpos_instruction: intent.softposInstruction,
      expires_at: intent.expiresAt,
      approved_at: intent.approvedAt,
      criado_em: intent.criadoEm,
      demo_mode: intent.provider === 'demo',
    };
  }

  private async resolveComandaValor(
    tenantId: string,
    comandaId: string,
    valor?: number,
  ) {
    const comanda = await this.comandasRepo.findOne({
      where: { id: comandaId, tenantId },
      relations: { items: true },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (
      comanda.status !== ComandaStatus.OPEN &&
      comanda.status !== ComandaStatus.PENDING_PAYMENT
    ) {
      throw new BadRequestException('Comanda não está aberta para pagamento');
    }
    if (comanda.status === ComandaStatus.OPEN && !comanda.items?.length) {
      throw new BadRequestException('Comanda sem itens');
    }

    const serialized = await this.comandasService.findOne(tenantId, comandaId);
    const restante = Number(serialized.restante);
    if (restante <= 0) {
      throw new BadRequestException('Comanda já está quitada');
    }

    const amount = valor != null ? Number(valor) : restante;
    if (amount <= 0 || amount > restante + 0.009) {
      throw new BadRequestException(
        `Valor inválido. Restante: R$ ${restante.toFixed(2)}`,
      );
    }

    return { comanda, amount, serialized };
  }

  async createPix(
    tenantId: string,
    dto: CreatePixPaymentDto,
    operadorId?: string,
  ) {
    const { amount } = await this.resolveComandaValor(
      tenantId,
      dto.comanda_id,
      dto.valor,
    );

    const charge = await this.pix.createCharge({
      valor: amount,
      comandaId: dto.comanda_id,
      descricao: `Comanda ${dto.comanda_id}`,
    });

    const intent = await this.intentsRepo.save(
      this.intentsRepo.create({
        tenantId,
        comandaId: dto.comanda_id,
        channel: PaymentIntentChannel.PIX,
        forma: PaymentMethod.PIX,
        valor: amount,
        status: PaymentIntentStatus.AWAITING_CUSTOMER,
        provider: charge.provider,
        providerRef: charge.providerRef,
        pixCopiaCola: charge.copiaCola,
        qrPayload: charge.qrPayload,
        expiresAt: charge.expiresAt,
        operadorId: operadorId ?? null,
      }),
    );

    return {
      ...this.serialize(intent),
      mensagem: 'Mostre o QR Code PIX ou copie o código para o cliente pagar no celular',
    };
  }

  async createCardContactless(
    tenantId: string,
    dto: CreateCardPaymentDto,
    operadorId?: string,
  ) {
    if (dto.forma !== PaymentMethod.DEBITO && dto.forma !== PaymentMethod.CREDITO) {
      throw new BadRequestException('Use forma debito ou credito para cartão por aproximação');
    }

    const { amount } = await this.resolveComandaValor(
      tenantId,
      dto.comanda_id,
      dto.valor,
    );

    const session = this.softpos.createSession({
      valor: amount,
      forma: dto.forma === PaymentMethod.CREDITO ? 'credito' : 'debito',
      comandaId: dto.comanda_id,
    });

    const intent = await this.intentsRepo.save(
      this.intentsRepo.create({
        tenantId,
        comandaId: dto.comanda_id,
        channel: PaymentIntentChannel.CARD_CONTACTLESS,
        forma: dto.forma,
        valor: amount,
        status: PaymentIntentStatus.AWAITING_CUSTOMER,
        provider: session.provider,
        providerRef: session.providerRef,
        softposInstruction: session.instruction,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        operadorId: operadorId ?? null,
      }),
    );

    return {
      ...this.serialize(intent),
      softpos_request: session.softposRequest,
      mensagem:
        'Aproxime o cartão de crédito/débito no NFC do telefone (Tap to Phone / SoftPOS)',
    };
  }

  async getStatus(tenantId: string, id: string) {
    const intent = await this.intentsRepo.findOne({ where: { id, tenantId } });
    if (!intent) throw new NotFoundException('Pagamento não encontrado');

    if (
      intent.status === PaymentIntentStatus.AWAITING_CUSTOMER &&
      intent.expiresAt &&
      intent.expiresAt < new Date()
    ) {
      intent.status = PaymentIntentStatus.EXPIRED;
      await this.intentsRepo.save(intent);
    }

    return this.serialize(intent);
  }

  /** Confirma intenção (webhook do PSP, SoftPOS SDK ou simulação demo) */
  async confirm(
    tenantId: string,
    id: string,
    dto: ConfirmPaymentDto,
    operadorId?: string,
  ) {
    const intent = await this.intentsRepo.findOne({ where: { id, tenantId } });
    if (!intent) throw new NotFoundException('Pagamento não encontrado');

    if (intent.status === PaymentIntentStatus.APPROVED) {
      return {
        ...this.serialize(intent),
        mensagem: 'Pagamento já estava aprovado',
        comanda: await this.comandasService.findOne(tenantId, intent.comandaId),
      };
    }

    if (
      intent.status !== PaymentIntentStatus.PENDING &&
      intent.status !== PaymentIntentStatus.AWAITING_CUSTOMER
    ) {
      throw new BadRequestException(`Pagamento em status ${intent.status}`);
    }

    if (intent.expiresAt && intent.expiresAt < new Date()) {
      intent.status = PaymentIntentStatus.EXPIRED;
      await this.intentsRepo.save(intent);
      throw new BadRequestException('Pagamento expirado — gere um novo');
    }

    if (dto.provider_ref) intent.providerRef = dto.provider_ref;
    if (dto.softpos_transaction_id) {
      intent.providerRef = dto.softpos_transaction_id;
    }

    intent.status = PaymentIntentStatus.APPROVED;
    intent.approvedAt = new Date();
    await this.intentsRepo.save(intent);

    const comanda = await this.comandasService.pay(
      tenantId,
      intent.comandaId,
      {
        pagamentos: [
          {
            forma: intent.forma,
            valor: Number(intent.valor),
            referencia_externa: intent.providerRef ?? intent.id,
            gateway: `${intent.provider}:${intent.channel}`,
          },
        ],
      },
      operadorId ?? intent.operadorId ?? undefined,
    );

    return {
      ...this.serialize(intent),
      mensagem: 'Pagamento aprovado e comanda atualizada',
      comanda,
    };
  }

  async cancel(tenantId: string, id: string) {
    const intent = await this.intentsRepo.findOne({ where: { id, tenantId } });
    if (!intent) throw new NotFoundException('Pagamento não encontrado');
    if (intent.status === PaymentIntentStatus.APPROVED) {
      throw new BadRequestException('Não é possível cancelar pagamento aprovado');
    }
    intent.status = PaymentIntentStatus.CANCELLED;
    await this.intentsRepo.save(intent);
    return this.serialize(intent);
  }

  providers() {
    return {
      strategy: 'phone_nfc',
      description:
        'PDV no celular com NFC: pulseira do cliente + pagamento PIX ou cartão por aproximação (SoftPOS)',
      pix: { provider: this.pix.mode },
      softpos: { provider: this.softpos.mode },
      channels: ['pix', 'card_contactless'],
    };
  }
}
