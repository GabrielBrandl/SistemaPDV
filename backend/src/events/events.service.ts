import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, Event, Order, OrderStatus } from '../database/entities';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
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

  create(tenantId: string, dto: CreateEventDto) {
    const event = this.eventsRepo.create({
      tenantId,
      nome: dto.nome,
      dataInicio: new Date(dto.data_inicio),
      dataFim: new Date(dto.data_fim),
      status: dto.status,
    });
    return this.eventsRepo.save(event);
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
