import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthUser } from '../types/auth-user';
import { requireTenantId } from '../types/auth-user';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{
      user: AuthUser;
      headers: Record<string, string | undefined>;
      query: Record<string, string | undefined>;
    }>();
    const override =
      request.headers['x-tenant-id'] ||
      request.query.tenant_id ||
      undefined;
    try {
      return requireTenantId(request.user, override);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'SUPER_ADMIN_TENANT_REQUIRED') {
        throw new BadRequestException(
          'Informe X-Tenant-Id para operar como super admin',
        );
      }
      throw new ForbiddenException('Usuário sem tenant vinculado');
    }
  },
);
