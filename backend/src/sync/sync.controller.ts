import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  sync(@TenantId() tenantId: string, @Body() dto: SyncDto) {
    return this.syncService.enqueue(tenantId, dto);
  }

  @Post('process')
  process(@TenantId() tenantId: string, @Body('pdv_id') pdvId?: string) {
    return this.syncService.processPending(tenantId, pdvId);
  }

  @Get('pending/:pdvId')
  pending(@TenantId() tenantId: string, @Param('pdvId') pdvId: string) {
    return this.syncService.getPending(tenantId, pdvId);
  }
}
