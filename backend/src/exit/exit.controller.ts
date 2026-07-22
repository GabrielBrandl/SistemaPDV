import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ExitService } from './exit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

class ExitCheckDto {
  @IsString()
  uid_nfc: string;
}

class ExitReleaseDto {
  @IsString()
  uid_nfc: string;

  @IsOptional()
  @IsBoolean()
  forcar?: boolean;

  @IsOptional()
  @IsString()
  observacao?: string;
}

class ReactivateDto {
  @IsString()
  uid_nfc: string;
}

@Controller('exit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExitController {
  constructor(private readonly exitService: ExitService) {}

  @Post('check')
  @Roles('exit', 'admin', 'super_admin', 'operator')
  check(@TenantId() tenantId: string, @Body() dto: ExitCheckDto) {
    return this.exitService.check(tenantId, dto.uid_nfc);
  }

  @Post('release')
  @Roles('exit', 'admin', 'super_admin')
  release(
    @TenantId() tenantId: string,
    @Body() dto: ExitReleaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    const canForce = user.role === 'admin' || user.role === 'super_admin';
    return this.exitService.release(tenantId, dto.uid_nfc, user.id, {
      forcar: canForce ? dto.forcar : false,
      observacao: canForce ? dto.observacao : undefined,
    });
  }

  @Get('today')
  @Roles('exit', 'admin', 'super_admin')
  today(@TenantId() tenantId: string) {
    return this.exitService.listToday(tenantId);
  }

  @Get('blocked')
  @Roles('exit', 'admin', 'super_admin')
  blocked(@TenantId() tenantId: string) {
    return this.exitService.listBlocked(tenantId);
  }

  @Post('reactivate')
  @Roles('admin', 'super_admin')
  reactivate(@TenantId() tenantId: string, @Body() dto: ReactivateDto) {
    return this.exitService.reactivateCard(tenantId, dto.uid_nfc);
  }
}
