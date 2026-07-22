import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  Order,
  OrderItem,
  OrderStatus,
  Product,
} from '../database/entities';
import { CardsService } from '../cards/cards.service';
import { FiscalService } from '../fiscal/fiscal.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddItemsDto } from './dto/add-items.dto';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemsRepo: Repository<OrderItem>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly cardsService: CardsService,
    @Inject(forwardRef(() => FiscalService))
    private readonly fiscalService: FiscalService,
  ) {}

  async create(tenantId: string, dto: CreateOrderDto) {
    const order = this.ordersRepo.create({
      tenantId,
      sessionId: dto.session_id ?? null,
      status: OrderStatus.OPEN,
      total: 0,
      transacaoId: dto.transacao_id ?? uuidv4(),
    });
    return this.ordersRepo.save(order);
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.ordersRepo.findOne({
      where: { id, tenantId },
      relations: { items: { produto: true } },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  async addItems(tenantId: string, id: string, dto: AddItemsDto) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Pedido não está aberto');
    }

    let totalAdded = 0;
    for (const item of dto.itens) {
      const product = await this.productsRepo.findOne({
        where: { id: item.produto_id, tenantId },
      });
      if (!product || !product.ativo) {
        throw new BadRequestException(`Produto ${item.produto_id} inválido`);
      }
      const lineTotal = Number(product.preco) * item.qtd;
      totalAdded += lineTotal;
      const orderItem = this.itemsRepo.create({
        orderId: order.id,
        produtoId: product.id,
        qtd: item.qtd,
        precoUnit: product.preco,
        total: lineTotal,
      });
      await this.itemsRepo.save(orderItem);
    }

    order.total = Number(order.total) + totalAdded;
    await this.ordersRepo.save(order);
    return this.findOne(tenantId, id);
  }

  async checkout(tenantId: string, id: string, dto: CheckoutDto) {
    const order = await this.findOne(tenantId, id);
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Pedido já finalizado');
    }

    const reserve = await this.cardsService.reserve(tenantId, dto.card_uid, {
      valor: Number(order.total),
      transacao_id: order.transacaoId ?? uuidv4(),
      pdv_id: dto.pdv_id,
    });

    const confirm = await this.cardsService.confirm(tenantId, dto.card_uid, {
      reserva_id: reserve.reserva_id,
      itens: order.items.map((i) => ({
        produto_id: i.produtoId,
        qtd: i.qtd,
        preco_unit: Number(i.precoUnit),
      })),
      pdv_id: dto.pdv_id,
    });

    const card = await this.cardsService.findByUid(tenantId, dto.card_uid);
    order.cardId = card.id;
    order.status = OrderStatus.PAID;
    await this.ordersRepo.save(order);

    let nfce = null;
    if (dto.emitir_nota) {
      nfce = await this.fiscalService.emit(tenantId, {
        order_id: order.id,
        cliente_cpf: dto.cliente_cpf,
        cliente_nome: dto.cliente_nome,
      });
    }

    return {
      order_id: order.id,
      ...confirm,
      total: Number(order.total),
      nfce,
    };
  }

  findPaid(tenantId: string) {
    return this.ordersRepo.find({
      where: { status: OrderStatus.PAID, tenantId },
      relations: { items: { produto: true } },
      order: { criadoEm: 'DESC' },
      take: 50,
    });
  }
}
