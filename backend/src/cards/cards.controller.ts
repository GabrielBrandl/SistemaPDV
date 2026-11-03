import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import {
  CreateRechargeIntentDto,
  RechargeDto,
} from './dto/recharge.dto';
import { ReserveDto } from './dto/reserve.dto';
import { ConfirmDto } from './dto/confirm.dto';
import { RefundDto } from './dto/refund.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

class TransferDto {
  @IsString()
  to_uid: string;
}

@Controller('cards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get(':uid/status')
  @RequirePermission('cards.manage', 'recharge.create', 'pos.sell', 'exit.control')
  getStatus(@TenantId() tenantId: string, @Param('uid') uid: string) {
    return this.cardsService.getStatus(tenantId, uid);
  }

  @Post()
  @RequirePermission('cards.manage')
  create(@TenantId() tenantId: string, @Body() dto: CreateCardDto) {
    return this.cardsService.create(tenantId, dto);
  }

  @Post(':uid/recharge/intent')
  @RequirePermission('recharge.create')
  createRechargeIntent(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: CreateRechargeIntentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cardsService.createRechargeIntent(tenantId, uid, dto, user.id);
  }

  @Post(':uid/recharge')
  @RequirePermission('recharge.create')
  recharge(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: RechargeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cardsService.recharge(tenantId, uid, dto, user.id);
  }

  @Post(':uid/reserve')
  @RequirePermission('pos.sell')
  reserve(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: ReserveDto,
  ) {
    return this.cardsService.reserve(tenantId, uid, dto);
  }

  @Post(':uid/confirm')
  @RequirePermission('pos.sell')
  confirm(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: ConfirmDto,
  ) {
    return this.cardsService.confirm(tenantId, uid, dto);
  }

  @Post(':uid/refund')
  @RequirePermission('refund.approve')
  refund(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: RefundDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cardsService.refund(tenantId, uid, dto, user.id);
  }

  @Post(':uid/block')
  @RequirePermission('cards.manage')
  block(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cardsService.block(tenantId, uid, user.id);
  }

  @Post(':uid/unblock')
  @RequirePermission('cards.manage')
  unblock(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cardsService.unblock(tenantId, uid, user.id);
  }

  @Post(':uid/transfer')
  @RequirePermission('cards.manage')
  transfer(
    @TenantId() tenantId: string,
    @Param('uid') uid: string,
    @Body() dto: TransferDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cardsService.transfer(tenantId, uid, dto.to_uid, user.id);
  }

  @Get(':uid/history')
  @RequirePermission('cards.manage', 'recharge.create', 'reports.view')
  history(@TenantId() tenantId: string, @Param('uid') uid: string) {
    return this.cardsService.getHistory(tenantId, uid);
  }

  @Post('reserves/:id/rollback')
  @RequirePermission('pos.sell')
  rollback(@Param('id') id: string) {
    return this.cardsService.rollback(id);
  }
}
