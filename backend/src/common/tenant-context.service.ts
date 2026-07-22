import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../common/types/auth-user';
import { requireTenantId } from '../common/types/auth-user';

@Injectable()
export class TenantContextService {
  resolveTenantId(user: AuthUser, overrideTenantId?: string): string {
    try {
      return requireTenantId(user, overrideTenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'SUPER_ADMIN_TENANT_REQUIRED') {
        throw new BadRequestException(
          'Informe o tenant_id (header X-Tenant-Id ou query) para operar como super admin',
        );
      }
      throw new ForbiddenException('Usuário sem tenant vinculado');
    }
  }
}
