import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { FiscalService } from './fiscal.service';
import { EmitNfceDto } from './dto/emit-nfce.dto';
import { UpdateFiscalConfigDto } from './dto/update-fiscal-config.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('fiscal')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage', 'reports.view')
  status(@TenantId() tenantId: string) {
    return this.fiscalService.getStatus(tenantId);
  }

  @Patch('config')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage', 'tenant.manage')
  updateConfig(
    @TenantId() tenantId: string,
    @Body() dto: UpdateFiscalConfigDto,
  ) {
    return this.fiscalService.updateConfig(tenantId, dto);
  }

  @Get('orders/pending')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage', 'reports.view')
  pendingOrders(@TenantId() tenantId: string) {
    return this.fiscalService.listPaidOrdersWithoutNfce(tenantId);
  }

  @Post('demo-order')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage')
  createDemoOrder(@TenantId() tenantId: string) {
    if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
      return this.fiscalService.rejectDemoInProduction();
    }
    return this.fiscalService.createDemoPaidOrder(tenantId);
  }

  @Post('nfce')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage')
  emit(@TenantId() tenantId: string, @Body() dto: EmitNfceDto) {
    return this.fiscalService.emit(tenantId, dto);
  }

  @Get('nfce')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage', 'reports.view')
  findAll(@TenantId() tenantId: string) {
    return this.fiscalService.findAll(tenantId);
  }

  @Get('nfce/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage', 'reports.view')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.fiscalService.findOne(tenantId, id);
  }

  @Get('nfce/:id/xml')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage', 'reports.view')
  @Header('Content-Type', 'application/xml')
  async getXml(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const xml = await this.fiscalService.getXml(tenantId, id);
    res.setHeader('Content-Disposition', `attachment; filename="nfce-${id}.xml"`);
    res.send(xml);
  }

  /** DANFE HTML — autenticado e filtrado por tenant */
  @Get('nfce/:id/danfe')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage', 'reports.view')
  async getDanfe(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.fiscalService.getDanfeHtml(tenantId, id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Post('nfce/:id/cancel')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('fiscal.manage')
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.fiscalService.cancel(tenantId, id);
  }
}
