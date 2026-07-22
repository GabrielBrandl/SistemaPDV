import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @Roles('admin', 'super_admin')
  list(@TenantId() tenantId: string) {
    return this.integrationsService.list(tenantId);
  }

  @Post()
  @Roles('admin', 'super_admin')
  create(@TenantId() tenantId: string, @Body() dto: CreateIntegrationDto) {
    return this.integrationsService.create(tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationsService.deactivate(tenantId, id);
  }
}
