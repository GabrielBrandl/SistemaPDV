import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CashMovement,
  CashMovementType,
  CashSession,
  CashSessionStatus,
  Event,
  EventStatus,
} from '../database/entities';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CashService {
  constructor(
    @InjectRepository(CashSession)
    private readonly sessionsRepo: Repository<CashSession>,
    @InjectRepository(CashMovement)
    private readonly movementsRepo: Repository<CashMovement>,
    @InjectRepository(Event)
    private readonly eventsRepo: Repository<Event>,
    private readonly audit: AuditService,
  ) {}

  async getOpen(tenantId: string, eventId: string, pdvId?: string | null) {
    const where: Record<string, unknown> = {
      tenantId,
      eventId,
      status: CashSessionStatus.OPEN,
    };
    if (pdvId) where.pdvId = pdvId;
    return this.sessionsRepo.findOne({
      where,
      order: { abertura: 'DESC' },
    });
  }

  async requireOpen(tenantId: string, eventId: string, pdvId?: string | null) {
    const event = await this.eventsRepo.findOne({ where: { id: eventId, tenantId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException('Evento não está ativo');
    }
    if (!event.exigeCaixaAberto) return null;
    const open = await this.getOpen(tenantId, eventId, pdvId);
    if (!open) {
      throw new BadRequestException({
        code: 'CASH_CLOSED',
        message: 'Abra o caixa antes de operar',
      });
    }
    return open;
  }

  async open(
    tenantId: string,
    params: {
      eventId: string;
      operadorId: string;
      fundoInicial: number;
      pdvId?: string | null;
    },
  ) {
    const existing = await this.getOpen(tenantId, params.eventId, params.pdvId);
    if (existing) {
      throw new BadRequestException('Já existe um caixa aberto');
    }
    const event = await this.eventsRepo.findOne({
      where: { id: params.eventId, tenantId },
    });
    if (!event || event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException('Evento inválido ou inativo');
    }

    const session = await this.sessionsRepo.save(
      this.sessionsRepo.create({
        tenantId,
        eventId: params.eventId,
        pdvId: params.pdvId ?? null,
        operadorId: params.operadorId,
        status: CashSessionStatus.OPEN,
        fundoInicial: params.fundoInicial,
        totalEntradas: 0,
        totalSaidas: 0,
        abertura: new Date(),
      }),
    );

    await this.movementsRepo.save(
      this.movementsRepo.create({
        cashSessionId: session.id,
        tipo: CashMovementType.OPENING,
        valor: params.fundoInicial,
        forma: 'dinheiro',
        observacao: 'Fundo de troco',
        operadorId: params.operadorId,
      }),
    );

    await this.audit.log({
      tenantId,
      actorUserId: params.operadorId,
      acao: 'cash.open',
      entidadeTipo: 'cash_session',
      entidadeId: session.id,
      depois: { fundoInicial: params.fundoInicial, eventId: params.eventId },
    });

    return session;
  }

  async close(
    tenantId: string,
    sessionId: string,
    operadorId: string,
    contado: number,
  ) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, tenantId },
    });
    if (!session) throw new NotFoundException('Caixa não encontrado');
    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('Caixa já fechado');
    }

    const esperado =
      Number(session.fundoInicial) +
      Number(session.totalEntradas) -
      Number(session.totalSaidas);
    const diferenca = Number(contado) - esperado;

    session.status = CashSessionStatus.CLOSED;
    session.fechamento = new Date();
    session.contadoFechamento = contado;
    session.diferenca = diferenca;
    await this.sessionsRepo.save(session);

    await this.movementsRepo.save(
      this.movementsRepo.create({
        cashSessionId: session.id,
        tipo: CashMovementType.CLOSING,
        valor: contado,
        forma: 'dinheiro',
        observacao: `Diferença: ${diferenca.toFixed(2)}`,
        operadorId,
      }),
    );

    await this.audit.log({
      tenantId,
      actorUserId: operadorId,
      acao: 'cash.close',
      entidadeTipo: 'cash_session',
      entidadeId: session.id,
      depois: { contado, esperado, diferenca },
    });

    return {
      ...session,
      esperado,
      diferenca,
    };
  }

  async addMovement(
    sessionId: string,
    data: {
      tipo: CashMovementType;
      valor: number;
      forma?: string;
      observacao?: string;
      referenciaTipo?: string;
      referenciaId?: string;
      operadorId?: string;
      isEntrada?: boolean;
    },
  ) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session || session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException('Caixa fechado');
    }

    const movement = await this.movementsRepo.save(
      this.movementsRepo.create({
        cashSessionId: sessionId,
        tipo: data.tipo,
        valor: data.valor,
        forma: data.forma ?? null,
        observacao: data.observacao ?? null,
        referenciaTipo: data.referenciaTipo ?? null,
        referenciaId: data.referenciaId ?? null,
        operadorId: data.operadorId ?? null,
      }),
    );

    const entrada =
      data.isEntrada ??
      [
        CashMovementType.SALE,
        CashMovementType.RECHARGE,
        CashMovementType.DEPOSIT,
        CashMovementType.OPENING,
      ].includes(data.tipo);

    if (entrada) {
      session.totalEntradas = Number(session.totalEntradas) + Number(data.valor);
    } else {
      session.totalSaidas = Number(session.totalSaidas) + Number(data.valor);
    }
    await this.sessionsRepo.save(session);
    return movement;
  }

  async listMovements(tenantId: string, sessionId: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, tenantId },
    });
    if (!session) throw new NotFoundException('Caixa não encontrado');
    return this.movementsRepo.find({
      where: { cashSessionId: sessionId },
      order: { criadoEm: 'DESC' },
    });
  }
}
