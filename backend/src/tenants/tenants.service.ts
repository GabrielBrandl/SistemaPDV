import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  Tenant,
  TenantPlan,
  TenantStatus,
  User,
  UserRole,
} from '../database/entities';
import { applyPlanLimits, getPlanDefinition } from '../plans/plans.config';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { OnboardTenantDto } from './dto/onboard-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  findAll() {
    return this.tenantsRepo.find({ order: { criadoEm: 'DESC' } });
  }

  async findOne(id: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { slug } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48);
  }

  async create(dto: CreateTenantDto) {
    const slug = dto.slug || this.slugify(dto.nome);
    const exists = await this.tenantsRepo.findOne({ where: { slug } });
    if (exists) throw new ConflictException('Slug já em uso');

    const plano = dto.plano ?? TenantPlan.STARTER;
    const limits = applyPlanLimits(plano);
    const planDef = getPlanDefinition(plano);
    const trialAte = new Date();
    trialAte.setDate(trialAte.getDate() + planDef.trial_dias);

    const tenant = this.tenantsRepo.create({
      nome: dto.nome,
      slug,
      razaoSocial: dto.razao_social ?? null,
      cnpj: dto.cnpj?.replace(/\D/g, '') ?? null,
      plano,
      status: TenantStatus.TRIAL,
      emailContato: dto.email_contato ?? null,
      telefone: dto.telefone ?? null,
      cidade: dto.cidade ?? null,
      uf: dto.uf ?? null,
      focusNfeToken: dto.focus_nfe_token ?? null,
      focusNfeAmbiente: dto.focus_nfe_ambiente ?? 'homologacao',
      empresaUfCodigo: dto.empresa_uf_codigo ?? '13',
      nfceSerie: dto.nfce_serie ?? 1,
      maxTerminais: dto.max_terminais ?? limits.maxTerminais,
      maxEventos: dto.max_eventos ?? limits.maxEventos,
      maxUsuarios: dto.max_usuarios ?? limits.maxUsuarios,
      valorMensal: planDef.preco_mensal,
      cicloCobranca: 'monthly',
      trialAte,
      proximaCobranca: trialAte,
    });
    return this.tenantsRepo.save(tenant);
  }

  async onboard(dto: OnboardTenantDto) {
    const existingUser = await this.usersRepo.findOne({
      where: { email: dto.admin_email },
    });
    if (existingUser) {
      throw new ConflictException('E-mail do administrador já cadastrado');
    }

    const plano = dto.plano ?? TenantPlan.STARTER;
    const tenant = await this.create({
      nome: dto.nome,
      slug: dto.slug,
      razao_social: dto.razao_social,
      cnpj: dto.cnpj,
      plano,
      email_contato: dto.admin_email,
      telefone: dto.telefone,
      cidade: dto.cidade,
      uf: dto.uf,
    });

    const password = await bcrypt.hash(dto.admin_password, 10);
    const admin = await this.usersRepo.save(
      this.usersRepo.create({
        email: dto.admin_email,
        password,
        name: dto.admin_name,
        role: UserRole.ADMIN,
        tenantId: tenant.id,
        telefone: dto.telefone ?? null,
        ativo: true,
      }),
    );

    return {
      tenant: {
        ...tenant,
        plan_def: getPlanDefinition(tenant.plano),
      },
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.findOne(id);
    if (dto.nome !== undefined) tenant.nome = dto.nome;
    if (dto.razao_social !== undefined) tenant.razaoSocial = dto.razao_social;
    if (dto.cnpj !== undefined) tenant.cnpj = dto.cnpj.replace(/\D/g, '');
    if (dto.plano !== undefined) {
      tenant.plano = dto.plano;
      const limits = applyPlanLimits(dto.plano);
      const def = getPlanDefinition(dto.plano);
      tenant.maxTerminais = limits.maxTerminais;
      tenant.maxEventos = limits.maxEventos;
      tenant.maxUsuarios = limits.maxUsuarios;
      tenant.valorMensal = def.preco_mensal;
    }
    if (dto.status !== undefined) tenant.status = dto.status;
    if (dto.email_contato !== undefined) tenant.emailContato = dto.email_contato;
    if (dto.telefone !== undefined) tenant.telefone = dto.telefone;
    if (dto.cidade !== undefined) tenant.cidade = dto.cidade;
    if (dto.uf !== undefined) tenant.uf = dto.uf;
    if (dto.focus_nfe_token !== undefined) tenant.focusNfeToken = dto.focus_nfe_token;
    if (dto.focus_nfe_ambiente !== undefined) {
      tenant.focusNfeAmbiente = dto.focus_nfe_ambiente;
    }
    if (dto.empresa_uf_codigo !== undefined) {
      tenant.empresaUfCodigo = dto.empresa_uf_codigo;
    }
    if (dto.nfce_serie !== undefined) tenant.nfceSerie = dto.nfce_serie;
    if (dto.max_terminais !== undefined) tenant.maxTerminais = dto.max_terminais;
    if (dto.max_eventos !== undefined) tenant.maxEventos = dto.max_eventos;
    if (dto.max_usuarios !== undefined) tenant.maxUsuarios = dto.max_usuarios;
    return this.tenantsRepo.save(tenant);
  }

  async getStats(id: string) {
    const tenant = await this.findOne(id);
    const users = await this.usersRepo.count({
      where: { tenantId: id, ativo: true },
    });
    return {
      tenant,
      usuarios: users,
      plan_def: getPlanDefinition(tenant.plano),
    };
  }

  async assertActive(tenantId: string) {
    const tenant = await this.findOne(tenantId);
    if (
      tenant.status === TenantStatus.SUSPENDED ||
      tenant.status === TenantStatus.CANCELLED
    ) {
      throw new BadRequestException('Tenant suspenso ou cancelado');
    }
    if (
      tenant.status === TenantStatus.TRIAL &&
      tenant.trialAte &&
      tenant.trialAte < new Date()
    ) {
      tenant.status = TenantStatus.SUSPENDED;
      await this.tenantsRepo.save(tenant);
      throw new BadRequestException('Período de trial expirado');
    }
    return tenant;
  }

  async assertWithinLimits(
    tenantId: string,
    kind: 'eventos' | 'terminais' | 'usuarios',
    currentCount: number,
  ) {
    const tenant = await this.assertActive(tenantId);
    const max =
      kind === 'eventos'
        ? tenant.maxEventos
        : kind === 'terminais'
          ? tenant.maxTerminais
          : tenant.maxUsuarios;
    if (currentCount >= max) {
      throw new BadRequestException(
        `Limite de ${kind} do plano (${max}) atingido. Faça upgrade.`,
      );
    }
    return tenant;
  }
}
