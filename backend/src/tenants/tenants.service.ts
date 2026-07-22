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

    const trialAte = new Date();
    trialAte.setDate(trialAte.getDate() + 14);

    const tenant = this.tenantsRepo.create({
      nome: dto.nome,
      slug,
      razaoSocial: dto.razao_social ?? null,
      cnpj: dto.cnpj?.replace(/\D/g, '') ?? null,
      plano: dto.plano ?? TenantPlan.STARTER,
      status: TenantStatus.TRIAL,
      focusNfeToken: dto.focus_nfe_token ?? null,
      focusNfeAmbiente: dto.focus_nfe_ambiente ?? 'homologacao',
      empresaUfCodigo: dto.empresa_uf_codigo ?? '13',
      nfceSerie: dto.nfce_serie ?? 1,
      maxTerminais: dto.max_terminais ?? 3,
      maxEventos: dto.max_eventos ?? 5,
      trialAte,
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

    const tenant = await this.create({
      nome: dto.nome,
      slug: dto.slug,
      razao_social: dto.razao_social,
      cnpj: dto.cnpj,
      plano: TenantPlan.STARTER,
    });

    const password = await bcrypt.hash(dto.admin_password, 10);
    const admin = await this.usersRepo.save(
      this.usersRepo.create({
        email: dto.admin_email,
        password,
        name: dto.admin_name,
        role: UserRole.ADMIN,
        tenantId: tenant.id,
      }),
    );

    return {
      tenant,
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
    if (dto.plano !== undefined) tenant.plano = dto.plano;
    if (dto.status !== undefined) tenant.status = dto.status;
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
    return this.tenantsRepo.save(tenant);
  }

  async getStats(id: string) {
    const tenant = await this.findOne(id);
    const users = await this.usersRepo.count({ where: { tenantId: id } });
    return {
      tenant,
      usuarios: users,
    };
  }

  assertActive(tenant: Tenant) {
    if (
      tenant.status === TenantStatus.SUSPENDED ||
      tenant.status === TenantStatus.CANCELLED
    ) {
      throw new BadRequestException('Tenant suspenso ou cancelado');
    }
  }
}
