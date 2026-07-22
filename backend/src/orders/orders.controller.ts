import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddItemsDto } from './dto/add-items.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(tenantId, dto);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ordersService.findOne(tenantId, id);
  }

  @Post(':id/items')
  addItems(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddItemsDto,
  ) {
    return this.ordersService.addItems(tenantId, id, dto);
  }

  @Post(':id/checkout')
  checkout(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(tenantId, id, dto);
  }
}
