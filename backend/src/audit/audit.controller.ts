import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';
import { normalizeRole } from '../shared/permissions';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit.view')
  list(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    const role = normalizeRole(user.role);
    const tenantId =
      role === 'platform_admin' ? null : user.tenantId;
    return this.auditService.list(tenantId, Number(limit) || 100);
  }
}
