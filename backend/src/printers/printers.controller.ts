import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermission,
} from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { PrintersService } from './printers.service';

@Controller('printers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Get()
  @RequirePermission('terminals.manage', 'tenant.manage')
  list(@TenantId() tenantId: string) {
    return this.printersService.list(tenantId);
  }

  @Post()
  @RequirePermission('terminals.manage', 'tenant.manage')
  create(@TenantId() tenantId: string, @Body() dto: CreatePrinterDto) {
    return this.printersService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('terminals.manage', 'tenant.manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePrinterDto,
  ) {
    return this.printersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('terminals.manage', 'tenant.manage')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.printersService.remove(tenantId, id);
  }

  @Post(':id/test')
  @RequirePermission('terminals.manage', 'tenant.manage')
  test(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.printersService.testPrint(tenantId, id);
  }
}
