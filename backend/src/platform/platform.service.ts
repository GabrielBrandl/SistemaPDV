import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  AuditLog,
  Card,
  Comanda,
  ComandaPayment,
  Event,
  InvoiceStatus,
  PdvTerminal,
  SubscriptionInvoice,
  Tenant,
  TenantPlan,
  TenantStatus,
  User,
  UserRole,
} from '../database/entities';
import { applyPlanLimits, getPlanDefinition, PLAN_CATALOG } from '../plans/plans.config';
import { ProvisionCompanyDto } from './dto/provision-company.dto';

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(PdvTerminal)
    private readonly terminalsRepo: Repository<PdvTerminal>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(Comanda)
    private readonly comandasRepo: Repository<Comanda>,
    @InjectRepository(ComandaPayment)
    private readonly paymentsRepo: Repository<ComandaPayment>,
    @InjectRepository(SubscriptionInvoice)
    private readonly invoicesRepo: Repository<SubscriptionInvoice>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  listPlans() {
    return PLAN_CATALOG;
  }

  async overview() {
    const tenants = await this.tenantsRepo.find();
    const byStatus = {
      trial: tenants.filter((t) => t.status === TenantStatus.TRIAL).length,
      active: tenants.filter((t) => t.status === TenantStatus.ACTIVE).length,
      suspended: tenants.filter((t) => t.status === TenantStatus.SUSPENDED).length,
      cancelled: tenants.filter((t) => t.status === TenantStatus.CANCELLED).length,
    };
    const byPlan = PLAN_CATALOG.map((p) => ({
      plano: p.id,
      nome: p.nome,
      total: tenants.filter((t) => t.plano === p.id).length,
    }));
    const mrr = tenants
      .filter((t) =>
        [TenantStatus.ACTIVE, TenantStatus.TRIAL].includes(t.status),
      )
      .reduce((sum, t) => sum + Number(t.valorMensal || 0), 0);

    const users = await this.usersRepo.count({
      where: { role: UserRole.ADMIN },
    });
    const invoicesPending = await this.invoicesRepo.count({
      where: { status: InvoiceStatus.PENDING },
    });
    const recent = await this.tenantsRepo.find({
      order: { criadoEm: 'DESC' },
      take: 8,
    });

    return {
      empresas: tenants.length,
      mrr,
      by_status: byStatus,
      by_plan: byPlan,
      admins_cadastrados: users,
      faturas_pendentes: invoicesPending,
      recentes: recent,
      planos: PLAN_CATALOG,
    };
  }

  async listCompanies(q?: string, status?: string, plano?: string) {
    const tenants = await this.tenantsRepo.find({
      order: { criadoEm: 'DESC' },
    });

    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const [usuarios, eventos, terminais, cartoes, comandas] =
          await Promise.all([
            this.usersRepo.count({ where: { tenantId: t.id, ativo: true } }),
            this.eventsRepo.count({ where: { tenantId: t.id } }),
            this.terminalsRepo.count({ where: { tenantId: t.id } }),
            this.cardsRepo.count({ where: { tenantId: t.id } }),
            this.comandasRepo.count({ where: { tenantId: t.id } }),
          ]);
        return {
          ...t,
          metrics: { usuarios, eventos, terminais, cartoes, comandas },
          plan_def: getPlanDefinition(t.plano),
        };
      }),
    );

    return enriched.filter((t) => {
      if (status && t.status !== status) return false;
      if (plano && t.plano !== plano) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${t.nome} ${t.slug} ${t.cnpj ?? ''} ${t.emailContato ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }

  async companyDetail(id: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    const [users, events, terminals, cards, invoices, audit] =
      await Promise.all([
        this.usersRepo.find({
          where: { tenantId: id },
          order: { criadoEm: 'DESC' },
          select: ['id', 'email', 'name', 'role', 'ativo', 'telefone', 'criadoEm'],
        }),
        this.eventsRepo.find({
          where: { tenantId: id },
          order: { dataInicio: 'DESC' },
          take: 20,
        }),
        this.terminalsRepo.find({ where: { tenantId: id } }),
        this.cardsRepo.count({ where: { tenantId: id } }),
        this.invoicesRepo.find({
          where: { tenantId: id },
          order: { criadoEm: 'DESC' },
          take: 24,
        }),
        this.auditRepo.find({
          where: { tenantId: id },
          order: { criadoEm: 'DESC' },
          take: 30,
        }),
      ]);

    const paidPayments = await this.paymentsRepo
      .createQueryBuilder('p')
      .innerJoin('p.comanda', 'c')
      .where('c.tenantId = :id', { id })
      .andWhere('p.status = :st', { st: 'confirmed' })
      .select('COALESCE(SUM(p.valor),0)', 'total')
      .getRawOne<{ total: string }>();

    return {
      tenant,
      plan_def: getPlanDefinition(tenant.plano),
      users,
      events,
      terminals,
      cards,
      invoices,
      audit,
      gmv_pagamentos: Number(paidPayments?.total ?? 0),
    };
  }

  async provision(dto: ProvisionCompanyDto, actorUserId?: string) {
    const existingUser = await this.usersRepo.findOne({
      where: { email: dto.admin_email },
    });
    if (existingUser) {
      throw new BadRequestException('E-mail do administrador já cadastrado');
    }

    const plano = dto.plano ?? TenantPlan.STARTER;
    const limits = applyPlanLimits(plano);
    const planDef = getPlanDefinition(plano);
    const trialAte = new Date();
    trialAte.setDate(trialAte.getDate() + (dto.trial_dias ?? planDef.trial_dias));

    const slug =
      dto.slug ||
      dto.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48);

    const exists = await this.tenantsRepo.findOne({ where: { slug } });
    if (exists) throw new BadRequestException('Slug já em uso');

    const proxima = new Date(trialAte);
    const tenant = await this.tenantsRepo.save(
      this.tenantsRepo.create({
        nome: dto.nome,
        slug,
        razaoSocial: dto.razao_social ?? null,
        cnpj: dto.cnpj?.replace(/\D/g, '') ?? null,
        plano,
        status: TenantStatus.TRIAL,
        emailContato: dto.email_contato ?? dto.admin_email,
        telefone: dto.telefone ?? null,
        cidade: dto.cidade ?? null,
        uf: dto.uf ?? null,
        notasInternas: dto.notas_internas ?? null,
        maxTerminais: dto.max_terminais ?? limits.maxTerminais,
        maxEventos: dto.max_eventos ?? limits.maxEventos,
        maxUsuarios: dto.max_usuarios ?? limits.maxUsuarios,
        cicloCobranca: dto.ciclo_cobranca ?? 'monthly',
        valorMensal:
          dto.valor_mensal ??
          (dto.ciclo_cobranca === 'yearly'
            ? planDef.preco_anual / 12
            : planDef.preco_mensal),
        trialAte,
        proximaCobranca: proxima,
      }),
    );

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

    await this.audit(tenant.id, actorUserId, 'empresa.provisionada', {
      plano,
      admin: admin.email,
    });

    return {
      tenant,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      plan_def: planDef,
    };
  }

  async changePlan(
    id: string,
    plano: TenantPlan,
    actorUserId?: string,
    opts?: { aplicar_limites?: boolean },
  ) {
    const tenant = await this.requireTenant(id);
    const prev = tenant.plano;
    tenant.plano = plano;
    const def = getPlanDefinition(plano);
    tenant.valorMensal =
      tenant.cicloCobranca === 'yearly'
        ? def.preco_anual / 12
        : def.preco_mensal;
    if (opts?.aplicar_limites !== false) {
      const limits = applyPlanLimits(plano);
      tenant.maxTerminais = limits.maxTerminais;
      tenant.maxEventos = limits.maxEventos;
      tenant.maxUsuarios = limits.maxUsuarios;
    }
    await this.tenantsRepo.save(tenant);
    await this.audit(id, actorUserId, 'empresa.plano_alterado', {
      de: prev,
      para: plano,
    });
    return tenant;
  }

  async setStatus(
    id: string,
    status: TenantStatus,
    actorUserId?: string,
    notas?: string,
  ) {
    const tenant = await this.requireTenant(id);
    const prev = tenant.status;
    tenant.status = status;
    if (notas) {
      tenant.notasInternas = [tenant.notasInternas, notas]
        .filter(Boolean)
        .join('\n');
    }
    await this.tenantsRepo.save(tenant);
    await this.audit(id, actorUserId, 'empresa.status_alterado', {
      de: prev,
      para: status,
    });
    return tenant;
  }

  async updateCompany(
    id: string,
    patch: Partial<{
      nome: string;
      razao_social: string | null;
      cnpj: string | null;
      email_contato: string | null;
      telefone: string | null;
      cidade: string | null;
      uf: string | null;
      notas_internas: string | null;
      max_terminais: number;
      max_eventos: number;
      max_usuarios: number;
      ciclo_cobranca: string;
      valor_mensal: number;
    }>,
    actorUserId?: string,
  ) {
    const tenant = await this.requireTenant(id);
    if (patch.nome !== undefined) tenant.nome = patch.nome;
    if (patch.razao_social !== undefined) tenant.razaoSocial = patch.razao_social;
    if (patch.cnpj !== undefined)
      tenant.cnpj = patch.cnpj ? patch.cnpj.replace(/\D/g, '') : null;
    if (patch.email_contato !== undefined)
      tenant.emailContato = patch.email_contato;
    if (patch.telefone !== undefined) tenant.telefone = patch.telefone;
    if (patch.cidade !== undefined) tenant.cidade = patch.cidade;
    if (patch.uf !== undefined) tenant.uf = patch.uf;
    if (patch.notas_internas !== undefined)
      tenant.notasInternas = patch.notas_internas;
    if (patch.max_terminais !== undefined)
      tenant.maxTerminais = patch.max_terminais;
    if (patch.max_eventos !== undefined) tenant.maxEventos = patch.max_eventos;
    if (patch.max_usuarios !== undefined)
      tenant.maxUsuarios = patch.max_usuarios;
    if (patch.ciclo_cobranca !== undefined)
      tenant.cicloCobranca = patch.ciclo_cobranca;
    if (patch.valor_mensal !== undefined)
      tenant.valorMensal = patch.valor_mensal;
    await this.tenantsRepo.save(tenant);
    await this.audit(id, actorUserId, 'empresa.atualizada', patch);
    return tenant;
  }

  async createInvoice(
    tenantId: string,
    opts?: { valor?: number; descricao?: string; ciclo?: string },
    actorUserId?: string,
  ) {
    const tenant = await this.requireTenant(tenantId);
    const inicio = new Date();
    const fim = new Date();
    fim.setMonth(fim.getMonth() + 1);
    const invoice = await this.invoicesRepo.save(
      this.invoicesRepo.create({
        tenantId,
        valor: opts?.valor ?? Number(tenant.valorMensal || 0),
        status: InvoiceStatus.PENDING,
        ciclo: opts?.ciclo ?? tenant.cicloCobranca,
        descricao:
          opts?.descricao ??
          `Assinatura ${tenant.plano} — ${tenant.nome}`,
        periodoInicio: inicio,
        periodoFim: fim,
      }),
    );
    await this.audit(tenantId, actorUserId, 'fatura.criada', {
      invoiceId: invoice.id,
      valor: invoice.valor,
    });
    return invoice;
  }

  async markInvoicePaid(invoiceId: string, actorUserId?: string) {
    const invoice = await this.invoicesRepo.findOne({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundException('Fatura não encontrada');
    invoice.status = InvoiceStatus.PAID;
    invoice.pagoEm = new Date();
    await this.invoicesRepo.save(invoice);

    const tenant = await this.requireTenant(invoice.tenantId);
    if (tenant.status === TenantStatus.TRIAL) {
      tenant.status = TenantStatus.ACTIVE;
    }
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    tenant.proximaCobranca = next;
    await this.tenantsRepo.save(tenant);

    await this.audit(invoice.tenantId, actorUserId, 'fatura.paga', {
      invoiceId,
    });
    return invoice;
  }

  async expireTrials() {
    const now = new Date();
    const trials = await this.tenantsRepo.find({
      where: { status: TenantStatus.TRIAL },
    });
    let suspended = 0;
    for (const t of trials) {
      if (t.trialAte && t.trialAte < now) {
        t.status = TenantStatus.SUSPENDED;
        await this.tenantsRepo.save(t);
        await this.audit(t.id, null, 'empresa.trial_expirado', {
          trialAte: t.trialAte,
        });
        suspended += 1;
      }
    }
    return { suspended };
  }

  private async requireTenant(id: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');
    return tenant;
  }

  private async audit(
    tenantId: string | null,
    actorUserId: string | null | undefined,
    acao: string,
    detalhe?: unknown,
  ) {
    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId,
        actorUserId: actorUserId ?? null,
        acao,
        detalhe: detalhe ? JSON.stringify(detalhe) : null,
      }),
    );
  }
}
