import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ComandasService } from './comandas.service';
import {
  AddComandaItemsDto,
  CloseComandaDto,
  NfcTapDto,
  PayComandaDto,
} from './dto/comanda.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('comandas')
@UseGuards(JwtAuthGuard)
export class ComandasController {
  constructor(private readonly comandasService: ComandasService) {}

  @Get('payment-methods')
  paymentMethods() {
    return this.comandasService.paymentMethods();
  }

  @Get('open')
  listOpen(@TenantId() tenantId: string) {
    return this.comandasService.listOpen(tenantId);
  }

  @Post('nfc/tap')
  nfcTap(
    @TenantId() tenantId: string,
    @Body() dto: NfcTapDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comandasService.nfcTap(tenantId, dto, user.id);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.comandasService.findOne(tenantId, id);
  }

  @Post(':id/items')
  addItems(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddComandaItemsDto,
  ) {
    return this.comandasService.addItems(tenantId, id, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.comandasService.removeItem(tenantId, id, itemId);
  }

  @Post(':id/close')
  close(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CloseComandaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comandasService.close(tenantId, id, dto, user.id);
  }

  @Post(':id/reopen')
  reopen(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.comandasService.reopen(tenantId, id);
  }

  @Post(':id/pay')
  pay(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: PayComandaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.comandasService.pay(tenantId, id, dto, user.id);
  }

  @Post(':id/cancel')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.comandasService.cancel(tenantId, id);
  }
}
