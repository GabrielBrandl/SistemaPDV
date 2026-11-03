import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @RequirePermission('reports.view', 'events.manage', 'pos.sell', 'recharge.create')
  findAll(@TenantId() tenantId: string) {
    return this.eventsService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('reports.view', 'events.manage', 'pos.sell')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.eventsService.findOne(tenantId, id);
  }

  @Get(':id/dashboard')
  @RequirePermission('reports.view')
  dashboard(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.eventsService.getDashboard(tenantId, id);
  }

  @Post()
  @RequirePermission('events.manage')
  create(@TenantId() tenantId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(tenantId, dto);
  }

  @Post(':id/activate')
  @RequirePermission('events.manage')
  activate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventsService.activate(tenantId, id, user.id);
  }

  @Post(':id/close')
  @RequirePermission('events.manage')
  close(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventsService.close(tenantId, id, user.id);
  }
}
