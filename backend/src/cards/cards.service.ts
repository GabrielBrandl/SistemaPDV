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
  Recharge,
  ReserveStatus,
  SaldoReserve,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../database/entities';
import { CreateCardDto } from './dto/create-card.dto';
import { RechargeDto } from './dto/recharge.dto';
import { ReserveDto } from './dto/reserve.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { RefundDto } from './dto/refund.dto';

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
    private readonly dataSource: DataSource,
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

  async recharge(tenantId: string, uid: string, dto: RechargeDto, operadorId?: string) {
    const card = await this.findByUid(tenantId, uid);
    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException('Cartão bloqueado ou inativo');
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
      return {
        card_id: card.id,
        uid: card.uidNfc,
        saldo: Number(card.saldo),
        recharge_id: recharge.id,
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

  async refund(tenantId: string, uid: string, dto: RefundDto, operadorId?: string) {
    const card = await this.findByUid(tenantId, uid);
    const valor = dto.valor ?? (await this.getAvailableBalance(card));
    if (valor <= 0) {
      throw new BadRequestException('Nada a devolver');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      card.saldo = Number(card.saldo) - valor;
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
