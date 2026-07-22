import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import {
  ConfirmPaymentDto,
  CreateCardPaymentDto,
  CreatePixPaymentDto,
} from './dto/payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('providers')
  @Roles('admin', 'super_admin', 'operator')
  providers() {
    return this.paymentsService.providers();
  }

  @Post('pix')
  @Roles('admin', 'super_admin', 'operator')
  createPix(
    @TenantId() tenantId: string,
    @Body() dto: CreatePixPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.createPix(tenantId, dto, user.id);
  }

  @Post('card')
  @Roles('admin', 'super_admin', 'operator')
  createCard(
    @TenantId() tenantId: string,
    @Body() dto: CreateCardPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.createCardContactless(tenantId, dto, user.id);
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'operator')
  status(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.getStatus(tenantId, id);
  }

  @Post(':id/confirm')
  @Roles('admin', 'super_admin', 'operator')
  confirm(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.confirm(tenantId, id, dto, user.id);
  }

  @Post(':id/cancel')
  @Roles('admin', 'super_admin', 'operator')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.cancel(tenantId, id);
  }
}
