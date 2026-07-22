import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { OnboardTenantDto } from './dto/onboard-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('onboard')
  onboard(@Body() dto: OnboardTenantDto) {
    return this.tenantsService.onboard(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    if (!user.tenantId) {
      return { tenant: null, role: user.role };
    }
    const tenant = await this.tenantsService.findOne(user.tenantId);
    return { tenant, role: user.role };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (user.role !== 'super_admin' && user.tenantId !== id) {
      return this.tenantsService.findOne(user.tenantId!);
    }
    return this.tenantsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthUser,
  ) {
    const targetId = user.role === 'super_admin' ? id : user.tenantId!;
    if (user.role === 'admin') {
      const { plano, status, max_terminais, max_eventos, ...safe } = dto;
      void plano;
      void status;
      void max_terminais;
      void max_eventos;
      return this.tenantsService.update(targetId, safe);
    }
    return this.tenantsService.update(targetId, dto);
  }
}
