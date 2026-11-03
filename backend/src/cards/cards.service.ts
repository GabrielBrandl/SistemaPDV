import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import {
  Card,
  CardStatus,
  CashMovementType,
  Event,
  EventMode,
  EventStatus,
  PaymentIntent,
  PaymentIntentChannel,
  PaymentIntentStatus,
  PaymentMethod,
  Recharge,
  ReserveStatus,
  SaldoReserve,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../database/entities';
import { CreateCardDto } from './dto/create-card.dto';
import {
  CreateRechargeIntentDto,
  RechargeDto,
} from './dto/recharge.dto';
import { ReserveDto } from './dto/reserve.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { RefundDto } from './dto/refund.dto';
import { AuditService } from '../audit/audit.service';
import { CashService } from '../cash/cash.service';
import { PixProvider } from '../payments/pix.provider';

const RESERVE_TTL_MS = 60_000;

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(Recharge) private readonly rechargesRepo: Repository<Recharge>,
    @InjectRepository(SaldoReserve)
    private readonly reservesRepo: Repository<SaldoReserve>,
    @InjectRepository(Transaction)
    private readonly transactionsRepo: Repository<Transaction>,
    @InjectRepository(PaymentIntent)
    private readonly intentsRepo: Repository<PaymentIntent>,
    @InjectRepository(Event)
    private readonly eventsRepo: Repository<Event>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly cash: CashService,
    private readonly pix: PixProvider,
  ) {}

  private normalizeUid(uid: string): string {
    return uid.replace(/:/g, '').toUpperCase();
  }

  async findByUid(tenantId: string, uid: string): Promise<Card> {
    const normalized = this.normalizeUid(uid);
    const card = await this.cardsRepo.findOne({
      where: [
        { tenantId, uidNfc: uid },
        { tenantId, uidNfc: normalized },
      ],
      relations: { event: true },
    });
    if (!card) {
      throw new NotFoundException(`Cartão NFC ${uid} não encontrado`);
    }
    return card;
  }

  async expireOldReserves(cardId: string) {
    await this.reservesRepo.update(
      {
        cardId,
        status: ReserveStatus.ACTIVE,
        expiraEm: LessThan(new Date()),
      },
      { status: ReserveStatus.EXPIRED },
    );
  }

  async getReservedAmount(cardId: string): Promise<number> {
    await this.expireOldReserves(cardId);
    const reserves = await this.reservesRepo.find({
      where: { cardId, status: ReserveStatus.ACTIVE },
    });
    return reserves.reduce((sum, r) => sum + Number(r.valor), 0);
  }

  async getAvailableBalance(card: Card): Promise<number> {
    const reserved = await this.getReservedAmount(card.id);
    return Number(card.saldo) - reserved;
  }

  async getStatus(tenantId: string, uid: string) {
    const card = await this.findByUid(tenantId, uid);
    const saldoDisponivel = await this.getAvailableBalance(card);
    const historico = await this.transactionsRepo.find({
      where: { cardId: card.id },
      order: { criadoEm: 'DESC' },
      take: 5,
    });

    return {
      uid: card.uidNfc,
      status: card.status,
      saldo_disponivel: saldoDisponivel,
      saldo_total: Number(card.saldo),
      nome_cliente: card.clienteNome,
      historico_recente: historico.map((t) => ({
        id: t.id,
        valor: Number(t.valor),
        tipo: t.tipo,
        status: t.status,
        criado_em: t.criadoEm,
      })),
    };
  }

  async create(tenantId: string, dto: CreateCardDto) {
    const uid = this.normalizeUid(dto.uid_nfc);
    const existing = await this.cardsRepo.findOne({
      where: { tenantId, uidNfc: uid },
    });
    if (existing) {
      throw new BadRequestException('Cartão já vinculado');
    }
    const card = this.cardsRepo.create({
      tenantId,
      uidNfc: uid,
      eventId: dto.event_id,
      clienteNome: dto.cliente_nome ?? null,
      saldo: dto.saldo_inicial ?? 0,
      status: CardStatus.ACTIVE,
    });
    return this.cardsRepo.save(card);
  }

  async createRechargeIntent(
    tenantId: string,
    uid: string,
    dto: CreateRechargeIntentDto,
    operadorId?: string,
  ) {
    const card = await this.findByUid(tenantId, uid);
    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException('Cartão bloqueado ou inativo');
    }

    const forma = dto.forma_pagamento;
    const isPix = forma === 'pix';
    const channel = isPix
      ? PaymentIntentChannel.PIX
      : PaymentIntentChannel.CARD_CONTACTLESS;

    let provider = dto.provider || 'demo';
    let pixCopiaCola: string | null = null;
    let qrPayload: string | null = null;
    let providerRef: string | null = null;
    let softposInstruction: string | null = null;

    if (isPix) {
      const charge = await this.pix.createCharge({
        valor: dto.valor,
        comandaId: `recharge:${card.id}`,
        descricao: `Recarga pulseira ${card.uidNfc}`,
        provider: dto.provider,
      });
      provider = charge.provider;
      pixCopiaCola = charge.copiaCola;
      qrPayload = charge.qrPayload;
      providerRef = charge.providerRef;
    } else if (forma !== 'dinheiro') {
      softposInstruction =
        'Aproxime o cartão do cliente na maquininha para concluir a recarga';
      provider = dto.provider || process.env.SOFTPOS_PROVIDER || 'demo';
    } else {
      throw new BadRequestException(
        'Para dinheiro, use POST /recharge diretamente com caixa aberto',
      );
    }

    const paymentForma =
      forma === 'pix'
        ? PaymentMethod.PIX
        : forma === 'cartao_credito'
          ? PaymentMethod.CREDITO
          : PaymentMethod.DEBITO;

    const intent = await this.intentsRepo.save(
      this.intentsRepo.create({
        tenantId,
        purpose: 'recharge',
        comandaId: null,
        cardId: card.id,
        channel,
        forma: paymentForma,
        valor: dto.valor,
        status: PaymentIntentStatus.AWAITING_CUSTOMER,
        provider,
        providerRef,
        pixCopiaCola,
        qrPayload,
        softposInstruction,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        operadorId: operadorId ?? null,
      }),
    );

    return {
      id: intent.id,
      purpose: 'recharge',
      card_uid: card.uidNfc,
      valor: Number(intent.valor),
      status: intent.status,
      provider: intent.provider,
      pix_copia_cola: intent.pixCopiaCola,
      qr_payload: intent.qrPayload,
      softpos_instruction: intent.softposInstruction,
      demo_mode: intent.provider === 'demo',
      expires_at: intent.expiresAt,
      mensagem:
        intent.provider === 'demo'
          ? 'Modo demo: confirme o pagamento e depois aplique a recarga'
          : 'Aguardando pagamento',
    };
  }

  async recharge(tenantId: string, uid: string, dto: RechargeDto, operadorId?: string) {
    const card = await this.findByUid(tenantId, uid);
    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException('Cartão bloqueado ou inativo');
    }

    const event =
      card.event ||
      (await this.eventsRepo.findOne({ where: { id: card.eventId, tenantId } }));
    if (!event || event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException('Evento inativo — não é possível recarregar');
    }
    if (event.modo === EventMode.POSTPAID) {
      throw new BadRequestException('Evento pós-pago não usa recarga prévia');
    }

    let intent: PaymentIntent | null = null;
    let cashSessionId: string | null = null;

    if (dto.forma_pagamento === 'dinheiro') {
      const cash = await this.cash.requireOpen(
        tenantId,
        dto.event_id || card.eventId,
        dto.pdv_id,
      );
      cashSessionId = cash?.id ?? null;
      intent = await this.intentsRepo.save(
        this.intentsRepo.create({
          tenantId,
          purpose: 'recharge',
          comandaId: null,
          cardId: card.id,
          channel: PaymentIntentChannel.PIX,
          forma: PaymentMethod.DINHEIRO,
          valor: dto.valor,
          status: PaymentIntentStatus.APPROVED,
          provider: 'cash',
          providerRef: cashSessionId,
          approvedAt: new Date(),
          operadorId: operadorId ?? null,
        }),
      );
    } else {
      if (!dto.payment_intent_id) {
        throw new BadRequestException({
          code: 'PAYMENT_REQUIRED',
          message: 'Informe payment_intent_id de um pagamento aprovado',
        });
      }
      intent = await this.intentsRepo.findOne({
        where: { id: dto.payment_intent_id, tenantId },
      });
      if (!intent || intent.purpose !== 'recharge') {
        throw new BadRequestException('Intent de recarga inválido');
      }
      if (intent.cardId && intent.cardId !== card.id) {
        throw new BadRequestException('Intent não pertence a esta pulseira');
      }
      if (intent.status !== PaymentIntentStatus.APPROVED) {
        throw new BadRequestException({
          code: 'PAYMENT_NOT_APPROVED',
          message: 'Pagamento ainda não aprovado',
        });
      }
      if (Math.abs(Number(intent.valor) - Number(dto.valor)) > 0.009) {
        throw new BadRequestException('Valor diverge do pagamento aprovado');
      }
      const already = await this.rechargesRepo.findOne({
        where: { paymentIntentId: intent.id },
      });
      if (already) {
        throw new BadRequestException('Esta recarga já foi creditada');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      card.saldo = Number(card.saldo) + dto.valor;
      await queryRunner.manager.save(card);

      const recharge = this.rechargesRepo.create({
        cardId: card.id,
        valor: dto.valor,
        formaPagamento: dto.forma_pagamento,
        status: 'completed',
        paymentIntentId: intent!.id,
        operadorId: operadorId ?? null,
      });
      await queryRunner.manager.save(recharge);

      const transaction = this.transactionsRepo.create({
        cardId: card.id,
        valor: dto.valor,
        tipo: TransactionType.CREDIT,
        gateway: dto.forma_pagamento,
        status: TransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      if (cashSessionId && dto.forma_pagamento === 'dinheiro') {
        await this.cash.addMovement(cashSessionId, {
          tipo: CashMovementType.RECHARGE,
          valor: dto.valor,
          forma: 'dinheiro',
          referenciaTipo: 'recharge',
          referenciaId: recharge.id,
          operadorId,
          isEntrada: true,
        });
      }

      await this.audit.log({
        tenantId,
        actorUserId: operadorId,
        acao: 'card.recharge',
        entidadeTipo: 'card',
        entidadeId: card.id,
        depois: {
          valor: dto.valor,
          forma: dto.forma_pagamento,
          payment_intent_id: intent!.id,
          saldo: Number(card.saldo),
        },
      });

      return {
        card_id: card.id,
        uid: card.uidNfc,
        saldo: Number(card.saldo),
        recharge_id: recharge.id,
        payment_intent_id: intent!.id,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async reserve(tenantId: string, uid: string, dto: ReserveDto) {
    const card = await this.findByUid(tenantId, uid);
    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException('Cartão bloqueado ou inativo');
    }

    const saldoAnterior = await this.getAvailableBalance(card);
    if (saldoAnterior < dto.valor) {
      throw new BadRequestException('Saldo insuficiente');
    }

    const reserve = this.reservesRepo.create({
      cardId: card.id,
      valor: dto.valor,
      transacaoId: dto.transacao_id,
      pdvId: dto.pdv_id ?? null,
      expiraEm: new Date(Date.now() + RESERVE_TTL_MS),
      status: ReserveStatus.ACTIVE,
    });
    const saved = await this.reservesRepo.save(reserve);

    return {
      reserva_id: saved.id,
      saldo_anterior: saldoAnterior,
      saldo_apos: saldoAnterior - dto.valor,
      expira_em: saved.expiraEm,
    };
  }

  async confirm(tenantId: string, uid: string, dto: ConfirmDto) {
    const card = await this.findByUid(tenantId, uid);
    const reserve = await this.reservesRepo.findOne({
      where: { id: dto.reserva_id, cardId: card.id },
    });

    if (!reserve || reserve.status !== ReserveStatus.ACTIVE) {
      throw new BadRequestException('Reserva inválida ou expirada');
    }
    if (reserve.expiraEm < new Date()) {
      reserve.status = ReserveStatus.EXPIRED;
      await this.reservesRepo.save(reserve);
      throw new BadRequestException('Reserva expirada');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      card.saldo = Number(card.saldo) - Number(reserve.valor);
      await queryRunner.manager.save(card);

      reserve.status = ReserveStatus.CONFIRMED;
      await queryRunner.manager.save(reserve);

      const transaction = this.transactionsRepo.create({
        cardId: card.id,
        valor: reserve.valor,
        tipo: TransactionType.DEBIT,
        gateway: 'nfc_pulseira',
        status: TransactionStatus.COMPLETED,
      });
      const savedTx = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      return {
        transacao_id: savedTx.id,
        status: 'completed',
        comprovante_url: `/api/v1/receipts/${savedTx.id}`,
        itens: dto.itens,
        pdv_id: dto.pdv_id,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async rollback(reservaId: string) {
    const reserve = await this.reservesRepo.findOne({ where: { id: reservaId } });
    if (!reserve) {
      throw new NotFoundException('Reserva não encontrada');
    }
    if (reserve.status === ReserveStatus.CONFIRMED) {
      throw new BadRequestException('Reserva já confirmada');
    }
    reserve.status = ReserveStatus.ROLLED_BACK;
    await this.reservesRepo.save(reserve);
    return { reserva_id: reservaId, status: 'rolled_back' };
  }

  async refund(
    tenantId: string,
    uid: string,
    dto: RefundDto,
    operadorId?: string,
    supervisorPinUserId?: string,
  ) {
    const card = await this.findByUid(tenantId, uid);
    const valor = dto.valor ?? (await this.getAvailableBalance(card));
    if (valor <= 0) {
      throw new BadRequestException('Nada a devolver');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const before = Number(card.saldo);
      card.saldo = before - valor;
      await queryRunner.manager.save(card);

      const transaction = this.transactionsRepo.create({
        cardId: card.id,
        valor,
        tipo: TransactionType.REFUND,
        gateway: dto.forma_devolucao ?? 'pix',
        status: TransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      await this.audit.log({
        tenantId,
        actorUserId: operadorId,
        acao: 'card.refund',
        entidadeTipo: 'card',
        entidadeId: card.id,
        antes: { saldo: before },
        depois: {
          valor_devolvido: valor,
          saldo: Number(card.saldo),
          supervisor: supervisorPinUserId,
        },
      });

      return {
        uid: card.uidNfc,
        valor_devolvido: valor,
        saldo_restante: Number(card.saldo),
        operador_id: operadorId,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async block(tenantId: string, uid: string, operadorId?: string) {
    const card = await this.findByUid(tenantId, uid);
    const before = card.status;
    card.status = CardStatus.BLOCKED;
    await this.cardsRepo.save(card);
    await this.audit.log({
      tenantId,
      actorUserId: operadorId,
      acao: 'card.block',
      entidadeTipo: 'card',
      entidadeId: card.id,
      antes: { status: before },
      depois: { status: card.status },
    });
    return card;
  }

  async unblock(tenantId: string, uid: string, operadorId?: string) {
    const card = await this.findByUid(tenantId, uid);
    const before = card.status;
    card.status = CardStatus.ACTIVE;
    await this.cardsRepo.save(card);
    await this.audit.log({
      tenantId,
      actorUserId: operadorId,
      acao: 'card.unblock',
      entidadeTipo: 'card',
      entidadeId: card.id,
      antes: { status: before },
      depois: { status: card.status },
    });
    return card;
  }

  async transfer(
    tenantId: string,
    fromUid: string,
    toUid: string,
    operadorId?: string,
  ) {
    const from = await this.findByUid(tenantId, fromUid);
    const toNormalized = this.normalizeUid(toUid);
    let to = await this.cardsRepo.findOne({
      where: [
        { tenantId, uidNfc: toUid },
        { tenantId, uidNfc: toNormalized },
      ],
    });
    if (!to) {
      to = await this.cardsRepo.save(
        this.cardsRepo.create({
          tenantId,
          uidNfc: toNormalized,
          eventId: from.eventId,
          clienteNome: from.clienteNome,
          customerId: from.customerId,
          saldo: 0,
          status: CardStatus.ACTIVE,
        }),
      );
    }
    const amount = await this.getAvailableBalance(from);
    if (amount <= 0) throw new BadRequestException('Sem saldo para transferir');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      from.saldo = Number(from.saldo) - amount;
      from.status = CardStatus.BLOCKED;
      to.saldo = Number(to.saldo) + amount;
      await queryRunner.manager.save(from);
      await queryRunner.manager.save(to);
      await queryRunner.manager.save(
        this.transactionsRepo.create({
          cardId: from.id,
          valor: amount,
          tipo: TransactionType.DEBIT,
          gateway: 'transfer_out',
          status: TransactionStatus.COMPLETED,
        }),
      );
      await queryRunner.manager.save(
        this.transactionsRepo.create({
          cardId: to.id,
          valor: amount,
          tipo: TransactionType.CREDIT,
          gateway: 'transfer_in',
          status: TransactionStatus.COMPLETED,
        }),
      );
      await queryRunner.commitTransaction();
      await this.audit.log({
        tenantId,
        actorUserId: operadorId,
        acao: 'card.transfer',
        entidadeTipo: 'card',
        entidadeId: from.id,
        depois: { to: to.uidNfc, valor: amount },
      });
      return {
        from_uid: from.uidNfc,
        to_uid: to.uidNfc,
        valor: amount,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async getHistory(tenantId: string, uid: string) {
    const card = await this.findByUid(tenantId, uid);
    const transactions = await this.transactionsRepo.find({
      where: { cardId: card.id },
      order: { criadoEm: 'DESC' },
    });
    const recharges = await this.rechargesRepo.find({
      where: { cardId: card.id },
      order: { criadoEm: 'DESC' },
    });
    return { transactions, recharges };
  }

  async listByEvent(tenantId: string, eventId: string) {
    return this.cardsRepo.find({ where: { tenantId, eventId } });
  }
}
