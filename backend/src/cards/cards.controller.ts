import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { RechargeDto } from './dto/recharge.dto';
import { ReserveDto } from './dto/reserve.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { RefundDto } from './dto/refund.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get(':uid/status')
  getStatus(@TenantId() tenantId: string, @Param('uid') uid: string) {
    return this.cardsService.getStatus(tenantId, uid);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateCardDto) {
    return this.cardsService.create(tenantId, dto);
  }

  @Post(':uid/recharge')
  recharge(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: RechargeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cardsService.recharge(tenantId, uid, dto, user.id);
  }

  @Post(':uid/reserve')
  reserve(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: ReserveDto,
  ) {
    return this.cardsService.reserve(tenantId, uid, dto);
  }

  @Post(':uid/confirm')
  confirm(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: ConfirmDto,
  ) {
    return this.cardsService.confirm(tenantId, uid, dto);
  }

  @Post(':uid/refund')
  refund(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: RefundDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cardsService.refund(tenantId, uid, dto, user.id);
  }

  @Get(':uid/history')
  history(@TenantId() tenantId: string, @Param('uid') uid: string) {
    return this.cardsService.getHistory(tenantId, uid);
  }

  @Post('reserves/:id/rollback')
  rollback(@Param('id') id: string) {
    return this.cardsService.rollback(id);
  }
}
