import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import {
  Card,
  CardStatus,
  Comanda,
  ComandaStatus,
  Customer,
} from '../database/entities';
import { CardsService } from '../cards/cards.service';
import { ComandasService } from '../comandas/comandas.service';
import { SupabaseCustomersService } from './supabase-customers.service';
import {
  CheckinCustomerDto,
  RegisterCustomerDto,
} from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(Comanda)
    private readonly comandasRepo: Repository<Comanda>,
    private readonly cardsService: CardsService,
    private readonly comandasService: ComandasService,
    private readonly supabase: SupabaseCustomersService,
  ) {}

  private onlyDigits(value: string) {
    return value.replace(/\D/g, '');
  }

  private normalizeCpf(cpf: string) {
    const digits = this.onlyDigits(cpf);
    if (digits.length !== 11) {
      throw new BadRequestException('CPF inválido');
    }
    return digits;
  }

  private normalizePhone(telefone: string) {
    const digits = this.onlyDigits(telefone);
    if (digits.length < 8) {
      throw new BadRequestException('Telefone inválido');
    }
    return digits;
  }

  private newSessionToken() {
    return randomBytes(24).toString('hex');
  }

  private serializeCustomer(c: Customer) {
    return {
      id: c.id,
      nome: c.nome,
      cpf: c.cpf,
      telefone: c.telefone,
      supabase_id: c.supabaseId,
      ultimo_visita_em: c.ultimoVisitaEm,
      criado_em: c.criadoEm,
    };
  }

  async lookupByCpf(tenantId: string, cpfRaw: string) {
    const cpf = this.normalizeCpf(cpfRaw);

    let customer = await this.customersRepo.findOne({
      where: { tenantId, cpf },
    });

    // Busca no Supabase se não estiver local
    if (!customer && this.supabase.enabled) {
      const remote = await this.supabase.findByCpf(tenantId, cpf);
      if (remote) {
        customer = await this.customersRepo.save(
          this.customersRepo.create({
            tenantId,
            nome: remote.nome,
            cpf: remote.cpf,
            telefone: remote.telefone,
            supabaseId: remote.id ?? null,
          }),
        );
      }
    }

    if (!customer) {
      return { encontrado: false, cpf };
    }

    return {
      encontrado: true,
      cpf,
      cliente: this.serializeCustomer(customer),
    };
  }

  async register(
    tenantId: string,
    dto: RegisterCustomerDto,
    operadorId?: string,
  ) {
    const cpf = this.normalizeCpf(dto.cpf);
    const telefone = this.normalizePhone(dto.telefone);
    const nome = dto.nome.trim();

    let customer = await this.customersRepo.findOne({
      where: { tenantId, cpf },
    });

    if (customer) {
      throw new BadRequestException(
        'CPF já cadastrado. Use o check-in com o CPF e o cartão.',
      );
    }

    customer = await this.customersRepo.save(
      this.customersRepo.create({
        tenantId,
        nome,
        cpf,
        telefone,
        ultimoVisitaEm: new Date(),
      }),
    );

    const supabaseId = await this.supabase.upsertCustomer(customer);
    if (supabaseId) {
      customer.supabaseId = supabaseId;
      await this.customersRepo.save(customer);
    }

    return this.bindCardAndOpen(
      tenantId,
      customer,
      dto.uid_nfc,
      dto.event_id,
      operadorId,
      'cadastro',
    );
  }

  async checkin(
    tenantId: string,
    dto: CheckinCustomerDto,
    operadorId?: string,
  ) {
    const lookup = await this.lookupByCpf(tenantId, dto.cpf);
    if (!lookup.encontrado || !lookup.cliente) {
      throw new NotFoundException(
        'Cliente não encontrado. Faça o cadastro completo.',
      );
    }

    const customer = await this.customersRepo.findOne({
      where: { id: lookup.cliente.id },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    customer.ultimoVisitaEm = new Date();
    await this.customersRepo.save(customer);
    await this.supabase.upsertCustomer(customer);

    return this.bindCardAndOpen(
      tenantId,
      customer,
      dto.uid_nfc,
      dto.event_id,
      operadorId,
      'checkin',
    );
  }

  private async bindCardAndOpen(
    tenantId: string,
    customer: Customer,
    uidNfc: string,
    eventId: string | undefined,
    operadorId: string | undefined,
    origem: 'cadastro' | 'checkin',
  ) {
    const uid = uidNfc.replace(/:/g, '').toUpperCase();
    const token = this.newSessionToken();

    let card: Card | null = null;
    try {
      card = await this.cardsService.findByUid(tenantId, uid);
    } catch {
      card = null;
    }

    if (!card) {
      if (!eventId) {
        throw new BadRequestException(
          'Informe event_id para configurar um cartão novo',
        );
      }
      card = await this.cardsRepo.save(
        this.cardsRepo.create({
          tenantId,
          uidNfc: uid,
          eventId,
          clienteNome: customer.nome,
          customerId: customer.id,
          sessionToken: token,
          saldo: 0,
          status: CardStatus.ACTIVE,
        }),
      );
    } else {
      // Cartão já existe: verifica se está livre ou do mesmo cliente
      if (
        card.customerId &&
        card.customerId !== customer.id &&
        card.status === CardStatus.ACTIVE
      ) {
        const open = await this.comandasRepo.count({
          where: {
            tenantId,
            cardId: card.id,
            status: In([ComandaStatus.OPEN, ComandaStatus.PENDING_PAYMENT]),
          },
        });
        if (open > 0) {
          throw new BadRequestException(
            'Este cartão ainda está vinculado a outro cliente com comanda aberta',
          );
        }
      }

      card.customerId = customer.id;
      card.clienteNome = customer.nome;
      card.sessionToken = token;
      card.status = CardStatus.ACTIVE;
      if (eventId) card.eventId = eventId;
      await this.cardsRepo.save(card);
    }

    // Abre ou retoma comanda via fluxo NFC (já existente)
    const tap = await this.comandasService.nfcTap(
      tenantId,
      { uid_nfc: card.uidNfc, event_id: eventId || card.eventId },
      operadorId,
    );

    // Garante customer_id e token na comanda
    await this.comandasRepo.update(
      { id: tap.comanda.id },
      { customerId: customer.id, cardToken: token },
    );

    const comanda = await this.comandasService.findOne(tenantId, tap.comanda.id);

    return {
      origem,
      mensagem:
        origem === 'cadastro'
          ? 'Cliente cadastrado, cartão configurado e comanda aberta'
          : 'Cliente reconhecido, cartão vinculado e comanda aberta',
      cliente: this.serializeCustomer(customer),
      cartao: {
        uid: card.uidNfc,
        status: card.status,
        session_token: token,
        customer_id: customer.id,
      },
      comanda,
      supabase_sync: this.supabase.enabled,
    };
  }

  async list(tenantId: string) {
    const list = await this.customersRepo.find({
      where: { tenantId },
      order: { nome: 'ASC' },
      take: 200,
    });
    return list.map((c) => this.serializeCustomer(c));
  }
}
