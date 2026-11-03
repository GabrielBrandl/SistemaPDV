import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import {
  RefreshToken,
  Tenant,
  TenantStatus,
  User,
} from '../database/entities';
import { homePathForRole, normalizeRole } from '../shared/permissions';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepo.findOne({
      where: { email },
      relations: { tenant: true },
    });
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  private async issueTokens(user: User, meta?: { ip?: string; ua?: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessExpires = process.env.JWT_EXPIRES_IN || '15m';
    const access_token = this.jwtService.sign(payload, {
      expiresIn: accessExpires,
    } as never);

    const refreshRaw = randomBytes(48).toString('hex');
    const days = Number(process.env.JWT_REFRESH_DAYS || 14);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshRaw),
        expiresAt,
        revokedAt: null,
        userAgent: meta?.ua ?? null,
        ip: meta?.ip ?? null,
      }),
    );

    return { access_token, refresh_token: refreshRaw, expires_in: accessExpires };
  }

  private serializeLogin(user: User, tokens: Awaited<ReturnType<AuthService['issueTokens']>>, trialExpiringDays: number | null) {
    const roleNorm = normalizeRole(user.role);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        role_normalized: roleNorm,
        tenantId: user.tenantId,
        home_path: homePathForRole(user.role),
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
            logoUrl: user.tenant.logoUrl,
            corPrimaria: user.tenant.corPrimaria,
            nomeExibicao: user.tenant.nomeExibicao,
          }
        : null,
      trial_expiring_days: trialExpiringDays,
    };
  }

  async login(
    email: string,
    password: string,
    meta?: { ip?: string; ua?: string },
  ) {
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
      if (tenant && !user.tenant) user.tenant = tenant;
    }

    const tokens = await this.issueTokens(user, meta);
    await this.audit.log({
      tenantId: user.tenantId,
      actorUserId: user.id,
      acao: 'auth.login',
      entidadeTipo: 'user',
      entidadeId: user.id,
      ip: meta?.ip,
      userAgent: meta?.ua,
    });
    return this.serializeLogin(user, tokens, trialExpiringDays);
  }

  async refresh(refreshToken: string, meta?: { ip?: string; ua?: string }) {
    const hash = this.hashToken(refreshToken);
    const row = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: { user: { tenant: true } },
    });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada — faça login novamente');
    }
    row.revokedAt = new Date();
    await this.refreshRepo.save(row);

    const user = row.user;
    if (!user?.ativo) throw new UnauthorizedException('Usuário desativado');
    const tokens = await this.issueTokens(user, meta);
    return this.serializeLogin(user, tokens, null);
  }

  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      const hash = this.hashToken(refreshToken);
      await this.refreshRepo.update(
        { tokenHash: hash },
        { revokedAt: new Date() },
      );
    } else if (userId) {
      await this.refreshRepo
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: new Date() })
        .where('user_id = :userId AND revoked_at IS NULL', { userId })
        .execute();
    }
    return { ok: true };
  }

  async verifyPinAndIssue(tenantId: string, pin: string, meta?: { ip?: string; ua?: string }) {
    const users = await this.usersRepo.find({
      where: { tenantId, ativo: true },
      relations: { tenant: true },
    });
    for (const user of users) {
      if (!user.pinHash) continue;
      if (await bcrypt.compare(pin, user.pinHash)) {
        const tokens = await this.issueTokens(user, meta);
        return this.serializeLogin(user, tokens, null);
      }
    }
    throw new UnauthorizedException('PIN inválido');
  }

  async setPin(userId: string, pin: string, actorRole: string) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new ForbiddenException('PIN deve ter 4 a 6 dígitos');
    }
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    user.pinHash = await bcrypt.hash(pin, 10);
    await this.usersRepo.save(user);
    await this.audit.log({
      tenantId: user.tenantId,
      actorUserId: userId,
      acao: 'auth.set_pin',
      entidadeTipo: 'user',
      entidadeId: userId,
      detalhe: `role=${actorRole}`,
    });
    return { ok: true };
  }
}
