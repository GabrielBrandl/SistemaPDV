import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus, User } from '../database/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepo.findOne({
      where: { email },
      relations: { tenant: true },
    });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (user.ativo === false) {
      throw new UnauthorizedException('Usuário desativado');
    }

    let trialExpiringDays: number | null = null;

    if (user.tenantId) {
      const tenant = await this.tenantsRepo.findOne({
        where: { id: user.tenantId },
      });
      if (
        tenant &&
        (tenant.status === TenantStatus.SUSPENDED ||
          tenant.status === TenantStatus.CANCELLED)
      ) {
        throw new UnauthorizedException('Conta do estabelecimento suspensa');
      }
      if (
        tenant &&
        tenant.status === TenantStatus.TRIAL &&
        tenant.trialAte &&
        tenant.trialAte < new Date()
      ) {
        tenant.status = TenantStatus.SUSPENDED;
        await this.tenantsRepo.save(tenant);
        throw new UnauthorizedException('Período de trial expirado');
      }
      if (tenant?.status === TenantStatus.TRIAL && tenant.trialAte) {
        trialExpiringDays = Math.ceil(
          (tenant.trialAte.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            nome: user.tenant.nome,
            slug: user.tenant.slug,
            plano: user.tenant.plano,
            status: user.tenant.status,
            trialAte: user.tenant.trialAte,
            maxTerminais: user.tenant.maxTerminais,
            maxEventos: user.tenant.maxEventos,
            maxUsuarios: user.tenant.maxUsuarios,
          }
        : null,
      trial_expiring_days: trialExpiringDays,
    };
  }
}
