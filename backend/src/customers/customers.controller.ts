import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import {
  CheckinCustomerDto,
  LookupCpfDto,
  RegisterCustomerDto,
} from './dto/customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission('customers.manage', 'exit.control')
  list(@TenantId() tenantId: string) {
    return this.customersService.list(tenantId);
  }

  @Post('lookup')
  @RequirePermission('customers.manage', 'recharge.create')
  lookup(@TenantId() tenantId: string, @Body() dto: LookupCpfDto) {
    return this.customersService.lookupByCpf(tenantId, dto.cpf);
  }

  @Post('register')
  @RequirePermission('customers.manage')
  register(
    @TenantId() tenantId: string,
    @Body() dto: RegisterCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.register(tenantId, dto, user.id);
  }

  @Post('checkin')
  @RequirePermission('customers.manage')
  checkin(
    @TenantId() tenantId: string,
    @Body() dto: CheckinCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.checkin(tenantId, dto, user.id);
  }
}
