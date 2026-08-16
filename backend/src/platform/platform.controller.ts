import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { ProvisionCompanyDto } from './dto/provision-company.dto';
import {
  ChangePlanDto,
  ChangeStatusDto,
  CreateInvoiceDto,
  UpdateCompanyDto,
} from './dto/platform.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('plans')
  listPlansPublic() {
    return this.platformService.listPlans();
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  overview() {
    return this.platformService.overview();
  }

  @Get('companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  companies(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('plano') plano?: string,
  ) {
    return this.platformService.listCompanies(q, status, plano);
  }

  @Get('companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  company(@Param('id') id: string) {
    return this.platformService.companyDetail(id);
  }

  @Post('companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  provision(
    @Body() dto: ProvisionCompanyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.platformService.provision(dto, user.id);
  }

  @Patch('companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  update(
    @Param('id') id: string,
    @Body() body: UpdateCompanyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.platformService.updateCompany(id, body, user.id);
  }

  @Post('companies/:id/plan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  changePlan(
    @Param('id') id: string,
    @Body() dto: ChangePlanDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.platformService.changePlan(id, dto.plano, user.id);
  }

  @Post('companies/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.platformService.setStatus(id, dto.status, user.id, dto.notas);
  }

  @Post('companies/:id/invoices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  createInvoice(
    @Param('id') id: string,
    @Body() body: CreateInvoiceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.platformService.createInvoice(id, body, user.id);
  }

  @Post('invoices/:id/pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  payInvoice(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.platformService.markInvoicePaid(id, user.id);
  }

  @Post('jobs/expire-trials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  expireTrials() {
    return this.platformService.expireTrials();
  }
}
