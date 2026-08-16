import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  Card,
  CardStatus,
  Event,
  EventStatus,
  PdvTerminal,
  Product,
  Tenant,
  TenantPlan,
  TenantStatus,
  User,
  UserRole,
} from './entities';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Event) private readonly eventsRepo: Repository<Event>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(PdvTerminal)
    private readonly terminalsRepo: Repository<PdvTerminal>,
  ) {}

  async onModuleInit() {
    const userCount = await this.usersRepo.count();
    if (userCount === 0) {
      await this.fullSeed();
    }
    await this.ensureExitUser();
    await this.ensureSuperAdmin();
  }

  private async ensureSuperAdmin() {
    const exists = await this.usersRepo.findOne({
      where: { email: 'super@pdv.local' },
    });
    if (exists) return;
    const password = await bcrypt.hash('super123', 10);
    await this.usersRepo.save(
      this.usersRepo.create({
        email: 'super@pdv.local',
        password,
        name: 'Super Admin SaaS',
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        ativo: true,
      }),
    );
    this.logger.log('Super admin criado: super@pdv.local / super123');
  }

  private async ensureExitUser() {
    const exists = await this.usersRepo.findOne({
      where: { email: 'saida@pdv.local' },
    });
    if (exists) return;

    const tenant = await this.tenantsRepo.findOne({ where: { slug: 'bar-demo' } });
    if (!tenant) return;

    const password = await bcrypt.hash('saida123', 10);
    await this.usersRepo.save(
      this.usersRepo.create({
        email: 'saida@pdv.local',
        password,
        name: 'Controle de Saída',
        role: UserRole.EXIT,
        tenantId: tenant.id,
      }),
    );
    this.logger.log('Usuário de saída criado: saida@pdv.local / saida123');
  }

  private async fullSeed() {
    this.logger.log('Populando banco SaaS multi-tenant...');

    const trialAte = new Date();
    trialAte.setDate(trialAte.getDate() + 30);

    const tenant = await this.tenantsRepo.save(
      this.tenantsRepo.create({
        nome: 'Bar Demo',
        slug: 'bar-demo',
        razaoSocial: 'Bar Demo LTDA',
        cnpj: '12345678000199',
        plano: TenantPlan.PRO,
        status: TenantStatus.ACTIVE,
        focusNfeAmbiente: 'homologacao',
        empresaUfCodigo: '13',
        nfceSerie: 1,
        maxTerminais: 10,
        maxEventos: 20,
        maxUsuarios: 50,
        emailContato: 'admin@pdv.local',
        telefone: '11999990000',
        cidade: 'São Paulo',
        uf: 'SP',
        valorMensal: 797,
        cicloCobranca: 'monthly',
        trialAte,
      }),
    );

    const superPassword = await bcrypt.hash('super123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);
    const operatorPassword = await bcrypt.hash('operador123', 10);
    const exitPassword = await bcrypt.hash('saida123', 10);

    await this.usersRepo.save(
      this.usersRepo.create({
        email: 'super@pdv.local',
        password: superPassword,
        name: 'Super Admin SaaS',
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
      }),
    );

    const admin = await this.usersRepo.save(
      this.usersRepo.create({
        email: 'admin@pdv.local',
        password: adminPassword,
        name: 'Admin Bar Demo',
        role: UserRole.ADMIN,
        tenantId: tenant.id,
      }),
    );

    await this.usersRepo.save(
      this.usersRepo.create({
        email: 'operador@pdv.local',
        password: operatorPassword,
        name: 'Operador Bar',
        role: UserRole.OPERATOR,
        tenantId: tenant.id,
      }),
    );

    await this.usersRepo.save(
      this.usersRepo.create({
        email: 'saida@pdv.local',
        password: exitPassword,
        name: 'Controle de Saída',
        role: UserRole.EXIT,
        tenantId: tenant.id,
      }),
    );

    const event = await this.eventsRepo.save(
      this.eventsRepo.create({
        tenantId: tenant.id,
        nome: 'Festival Demo 2026',
        dataInicio: new Date('2026-07-10T18:00:00Z'),
        dataFim: new Date('2026-07-11T06:00:00Z'),
        status: EventStatus.ACTIVE,
      }),
    );

    const products = [
      { nome: 'Cerveja Lata', preco: 12, categoria: 'Bebidas' },
      { nome: 'Refrigerante', preco: 8, categoria: 'Bebidas' },
      { nome: 'Água', preco: 5, categoria: 'Bebidas' },
      { nome: 'Hambúrguer', preco: 25, categoria: 'Comidas' },
      { nome: 'Porção Batata', preco: 18, categoria: 'Comidas' },
      { nome: 'Combo Bar', preco: 35, categoria: 'Combos' },
    ];

    for (const p of products) {
      await this.productsRepo.save(
        this.productsRepo.create({
          ...p,
          tenantId: tenant.id,
          eventId: event.id,
          ativo: true,
        }),
      );
    }

    await this.cardsRepo.save(
      this.cardsRepo.create({
        tenantId: tenant.id,
        uidNfc: '04A3B2112233',
        eventId: event.id,
        clienteNome: 'Cliente Demo',
        saldo: 100,
        status: CardStatus.ACTIVE,
      }),
    );

    await this.terminalsRepo.save(
      this.terminalsRepo.create({
        tenantId: tenant.id,
        serial: 'PDV-001',
        adquirente: 'stone',
        modelo: 'PAX A920',
      }),
    );

    this.logger.log(`Tenant demo: ${tenant.slug}`);
    this.logger.log(`Admin: ${admin.email} / admin123`);
    this.logger.log('Saída: saida@pdv.local / saida123');
    this.logger.log('Super: super@pdv.local / super123');
  }
}
