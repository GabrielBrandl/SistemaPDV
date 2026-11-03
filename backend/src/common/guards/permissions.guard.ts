import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../types/auth-user';
import { can, type Permission } from '../../shared/permissions';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permissions?.length) return true;

    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;
    const ok = permissions.some((p) => can(user?.role, p));
    if (!ok) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Sem permissão para esta ação',
      });
    }
    return true;
  }
}
