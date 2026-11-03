import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Card,
  Event,
  EventMode,
  EventStatus,
  Order,
  OrderStatus,
  Tenant,
} from '../database/entities';
import { CreateEventDto } from './dto/create-event.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    private readonly audit: AuditService,
  ) {}

  findAll(tenantId: string) {
    return this.eventsRepo.find({
      where: { tenantId },
      order: { dataInicio: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const event = await this.eventsRepo.findOne({ where: { id, tenantId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return event;
  }

  async create(tenantId: string, dto: CreateEventDto) {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    const count = await this.eventsRepo.count({ where: { tenantId } });
    if (count >= tenant.maxEventos) {
      throw new BadRequestException(
        `Limite de eventos do plano (${tenant.maxEventos}) atingido`,
      );
    }
    const event = this.eventsRepo.create({
      tenantId,
      nome: dto.nome,
      dataInicio: new Date(dto.data_inicio),
      dataFim: new Date(dto.data_fim),
      status: dto.status ?? EventStatus.DRAFT,
      modo: dto.modo ?? EventMode.PREPAID,
      somenteAdultos: dto.somente_adultos ?? false,
      exigeCaixaAberto: dto.exige_caixa_aberto ?? true,
      limiteCreditoPostpaid: dto.limite_credito_postpaid ?? null,
    });
    const saved = await this.eventsRepo.save(event);
    await this.audit.log({
      tenantId,
      acao: 'event.create',
      entidadeTipo: 'event',
      entidadeId: saved.id,
      depois: { nome: saved.nome, modo: saved.modo },
    });
    return saved;
  }

  async activate(tenantId: string, id: string, actorUserId?: string) {
    const event = await this.findOne(tenantId, id);
    if (event.status === EventStatus.CLOSED) {
      throw new BadRequestException('Evento encerrado não pode ser reativado');
    }
    event.status = EventStatus.ACTIVE;
    const saved = await this.eventsRepo.save(event);
    await this.audit.log({
      tenantId,
      actorUserId,
      acao: 'event.activate',
      entidadeTipo: 'event',
      entidadeId: id,
    });
    return saved;
  }

  async close(tenantId: string, id: string, actorUserId?: string) {
    const event = await this.findOne(tenantId, id);
    event.status = EventStatus.CLOSED;
    const saved = await this.eventsRepo.save(event);
    await this.audit.log({
      tenantId,
      actorUserId,
      acao: 'event.close',
      entidadeTipo: 'event',
      entidadeId: id,
    });
    return saved;
  }

  async getDashboard(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const cards = await this.cardsRepo.find({ where: { eventId: id, tenantId } });
    const orders = await this.ordersRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'item')
      .innerJoin('item.produto', 'product')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('product.eventId = :eventId', { eventId: id })
      .andWhere('o.status = :status', { status: OrderStatus.PAID })
      .getMany();

    const totalVendas = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const saldoCirculando = cards.reduce((sum, c) => sum + Number(c.saldo), 0);
    const cartoesAtivos = cards.filter((c) => c.status === 'active').length;

    return {
      event_id: id,
      tenant_id: tenantId,
      total_vendas: totalVendas,
      num_transacoes: orders.length,
      cartoes_ativos: cartoesAtivos,
      saldo_total_circulando: saldoCirculando,
      atualizado_em: new Date().toISOString(),
    };
  }
}
