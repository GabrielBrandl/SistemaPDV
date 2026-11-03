import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../types/auth-user';
import { normalizeRole } from '../../shared/permissions';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

function roleMatches(userRole: string, required: string): boolean {
  if (userRole === required) return true;
  const u = normalizeRole(userRole);
  const r = normalizeRole(required);
  return !!u && !!r && u === r;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;
    if (!user?.role || !roles.some((r) => roleMatches(user.role, r))) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Sem permissão para esta ação',
      });
    }
    return true;
  }
}
