import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { FiscalService } from './fiscal.service';
import { EmitNfceDto } from './dto/emit-nfce.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('fiscal')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@TenantId() tenantId: string) {
    return this.fiscalService.getStatus(tenantId);
  }

  @Get('orders/pending')
  @UseGuards(JwtAuthGuard)
  pendingOrders(@TenantId() tenantId: string) {
    return this.fiscalService.listPaidOrdersWithoutNfce(tenantId);
  }

  @Post('demo-order')
  @UseGuards(JwtAuthGuard)
  createDemoOrder(@TenantId() tenantId: string) {
    return this.fiscalService.createDemoPaidOrder(tenantId);
  }

  @Post('nfce')
  @UseGuards(JwtAuthGuard)
  emit(@TenantId() tenantId: string, @Body() dto: EmitNfceDto) {
    return this.fiscalService.emit(tenantId, dto);
  }

  @Get('nfce')
  @UseGuards(JwtAuthGuard)
  findAll(@TenantId() tenantId: string) {
    return this.fiscalService.findAll(tenantId);
  }

  @Get('nfce/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.fiscalService.findOne(tenantId, id);
  }

  @Get('nfce/:id/xml')
  @UseGuards(JwtAuthGuard)
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

  @Get('nfce/:id/danfe')
  async getDanfe(@Param('id') id: string, @Res() res: Response) {
    const html = await this.fiscalService.getDanfeHtml(null, id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Post('nfce/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.fiscalService.cancel(tenantId, id);
  }
}
