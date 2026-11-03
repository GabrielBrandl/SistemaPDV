import { normalizeRole } from '../../shared/permissions';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
};

export function requireTenantId(user: AuthUser, overrideTenantId?: string): string {
  const role = normalizeRole(user.role);
  if (role === 'platform_admin' || user.role === 'super_admin') {
    if (overrideTenantId) return overrideTenantId;
    if (user.tenantId) return user.tenantId;
    throw new Error('SUPER_ADMIN_TENANT_REQUIRED');
  }
  if (!user.tenantId) {
    throw new Error('TENANT_REQUIRED');
  }
  return user.tenantId;
}
