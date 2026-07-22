import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.eventsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.eventsService.findOne(tenantId, id);
  }

  @Get(':id/dashboard')
  dashboard(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.eventsService.getDashboard(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateEventDto) {
    return this.eventsService.create(tenantId, dto);
  }
}
