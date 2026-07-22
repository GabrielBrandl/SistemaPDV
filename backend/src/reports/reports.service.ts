import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderItem, OrderStatus } from '../database/entities';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemsRepo: Repository<OrderItem>,
  ) {}

  async salesReport(tenantId: string, eventId?: string, from?: string, to?: string) {
    const qb = this.ordersRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .andWhere('o.tenantId = :tenantId', { tenantId });

    if (from) qb.andWhere('o.criadoEm >= :from', { from: new Date(from) });
    if (to) qb.andWhere('o.criadoEm <= :to', { to: new Date(to) });

    if (eventId) {
      qb.innerJoin('items.produto', 'p').andWhere('p.eventId = :eventId', { eventId });
    }

    const orders = await qb.orderBy('o.criadoEm', 'DESC').getMany();
    const total = orders.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      total_vendas: total,
      quantidade_pedidos: orders.length,
      pedidos: orders,
    };
  }

  async topProducts(tenantId: string, eventId: string, limit = 10) {
    return this.itemsRepo
      .createQueryBuilder('item')
      .innerJoin('item.produto', 'product')
      .innerJoin('item.order', 'order')
      .select('product.id', 'produto_id')
      .addSelect('product.nome', 'nome')
      .addSelect('SUM(item.qtd)', 'quantidade')
      .addSelect('SUM(item.total)', 'receita')
      .where('product.eventId = :eventId', { eventId })
      .andWhere('product.tenantId = :tenantId', { tenantId })
      .andWhere('order.status = :status', { status: OrderStatus.PAID })
      .groupBy('product.id')
      .addGroupBy('product.nome')
      .orderBy('quantidade', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
