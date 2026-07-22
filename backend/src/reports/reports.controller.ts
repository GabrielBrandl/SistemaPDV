import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  sales(
    @TenantId() tenantId: string,
    @Query('event_id') eventId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.salesReport(tenantId, eventId, from, to);
  }

  @Get('products')
  products(
    @TenantId() tenantId: string,
    @Query('event_id') eventId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.topProducts(
      tenantId,
      eventId,
      limit ? Number(limit) : 10,
    );
  }
}
