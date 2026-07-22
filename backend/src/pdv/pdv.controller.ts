import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PdvService } from './pdv.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('pdv')
@UseGuards(JwtAuthGuard)
export class PdvController {
  constructor(private readonly pdvService: PdvService) {}

  @Post('sessions/open')
  openSession(@TenantId() tenantId: string, @Body() dto: OpenSessionDto) {
    return this.pdvService.openSession(tenantId, dto);
  }

  @Post('sessions/close')
  closeSession(@TenantId() tenantId: string, @Body() dto: CloseSessionDto) {
    return this.pdvService.closeSession(tenantId, dto);
  }

  @Get('terminals')
  listTerminals(@TenantId() tenantId: string) {
    return this.pdvService.listTerminals(tenantId);
  }

  @Get(':id/status')
  getStatus(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.pdvService.getTerminalStatus(tenantId, id);
  }
}
