import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Order, OrderStatus } from '../database/entities';

/** KDS simples — fila de pedidos pagos aguardando preparo */
@Controller('kds')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KdsController {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
  ) {}

  @Get('queue')
  @RequirePermission('pos.sell', 'products.manage')
  async queue(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Number(limit) || 30, 100);
    const orders = await this.ordersRepo.find({
      where: { tenantId, status: OrderStatus.PAID },
      relations: { items: true },
      order: { criadoEm: 'ASC' },
      take,
    });
    return orders.map((o) => ({
      id: o.id,
      total: Number(o.total),
      criado_em: o.criadoEm,
      itens: (o.items || []).map((i) => ({
        id: i.id,
        quantidade: i.qtd,
        produto_id: i.produtoId,
      })),
    }));
  }
}
