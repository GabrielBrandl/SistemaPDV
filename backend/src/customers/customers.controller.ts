import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import {
  CheckinCustomerDto,
  LookupCpfDto,
  RegisterCustomerDto,
} from './dto/customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles('admin', 'super_admin', 'operator', 'exit')
  list(@TenantId() tenantId: string) {
    return this.customersService.list(tenantId);
  }

  @Post('lookup')
  @Roles('admin', 'super_admin', 'operator')
  lookup(@TenantId() tenantId: string, @Body() dto: LookupCpfDto) {
    return this.customersService.lookupByCpf(tenantId, dto.cpf);
  }

  @Post('register')
  @Roles('admin', 'super_admin', 'operator')
  register(
    @TenantId() tenantId: string,
    @Body() dto: RegisterCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.register(tenantId, dto, user.id);
  }

  @Post('checkin')
  @Roles('admin', 'super_admin', 'operator')
  checkin(
    @TenantId() tenantId: string,
    @Body() dto: CheckinCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.checkin(tenantId, dto, user.id);
  }
}
