import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import { CashService } from './cash.service';
import { CashMovementType } from '../database/entities';

class OpenCashDto {
  @IsUUID()
  event_id: string;

  @IsNumber()
  @Min(0)
  fundo_inicial: number;

  @IsOptional()
  @IsString()
  pdv_id?: string;
}

class CloseCashDto {
  @IsNumber()
  @Min(0)
  contado: number;
}

class MovementDto {
  @IsString()
  tipo: CashMovementType;

  @IsNumber()
  valor: number;

  @IsOptional()
  @IsString()
  forma?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}

@Controller('cash')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('open')
  @RequirePermission('cash.open')
  getOpen(
    @TenantId() tenantId: string,
    @Query('event_id') eventId: string,
    @Query('pdv_id') pdvId?: string,
  ) {
    return this.cashService.getOpen(tenantId, eventId, pdvId);
  }

  @Post('open')
  @RequirePermission('cash.open')
  open(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: OpenCashDto,
  ) {
    return this.cashService.open(tenantId, {
      eventId: dto.event_id,
      operadorId: user.id,
      fundoInicial: dto.fundo_inicial,
      pdvId: dto.pdv_id,
    });
  }

  @Post(':id/close')
  @RequirePermission('cash.close')
  close(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CloseCashDto,
  ) {
    return this.cashService.close(tenantId, id, user.id, dto.contado);
  }

  @Get(':id/movements')
  @RequirePermission('cash.open')
  movements(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.cashService.listMovements(tenantId, id);
  }

  @Post(':id/movements')
  @RequirePermission('cash.open')
  addMovement(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MovementDto,
  ) {
    void tenantId;
    return this.cashService.addMovement(id, {
      tipo: dto.tipo,
      valor: dto.valor,
      forma: dto.forma,
      observacao: dto.observacao,
      operadorId: user.id,
    });
  }
}
