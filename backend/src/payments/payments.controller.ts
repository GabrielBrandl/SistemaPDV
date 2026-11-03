import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import {
  ConfirmPaymentDto,
  CreateCardPaymentDto,
  CreatePixPaymentDto,
} from './dto/payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('providers')
  @RequirePermission('pos.sell', 'recharge.create', 'integrations.manage')
  providers() {
    return this.paymentsService.providers();
  }

  @Post('pix')
  @RequirePermission('pos.sell', 'recharge.create')
  createPix(
    @TenantId() tenantId: string,
    @Body() dto: CreatePixPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.createPix(tenantId, dto, user.id);
  }

  @Post('card')
  @RequirePermission('pos.sell', 'recharge.create')
  createCard(
    @TenantId() tenantId: string,
    @Body() dto: CreateCardPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.createCardContactless(tenantId, dto, user.id);
  }

  @Get(':id')
  @RequirePermission('pos.sell', 'recharge.create')
  status(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.getStatus(tenantId, id);
  }

  @Post(':id/confirm')
  @RequirePermission('pos.sell', 'recharge.create')
  confirm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.confirm(tenantId, id, dto, user.id);
  }

  @Post(':id/cancel')
  @RequirePermission('pos.sell', 'recharge.create')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.cancel(tenantId, id);
  }
}
