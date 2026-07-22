import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  Comanda,
  ComandaItem,
  ComandaPayment,
  ComandaStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  CardStatus,
} from '../database/entities';
import { CardsService } from '../cards/cards.service';
import { IntegrationsService } from '../integrations/integrations.service';
import {
  AddComandaItemsDto,
  CloseComandaDto,
  NfcTapDto,
  PayComandaDto,
} from './dto/comanda.dto';

@Injectable()
export class ComandasService {
  constructor(
    @InjectRepository(Comanda) private readonly comandasRepo: Repository<Comanda>,
    @InjectRepository(ComandaItem) private readonly itemsRepo: Repository<ComandaItem>,
    @InjectRepository(ComandaPayment)
    private readonly paymentsRepo: Repository<ComandaPayment>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly cardsService: CardsService,
    private readonly integrations: IntegrationsService,
  ) {}

  private async nextNumero(tenantId: string): Promise<number> {
    const last = await this.comandasRepo.findOne({
      where: { tenantId },
      order: { numero: 'DESC' },
    });
    return (last?.numero ?? 0) + 1;
  }

  private serialize(comanda: Comanda) {
    const totalPago = Number(comanda.totalPago);
    const total = Number(comanda.total);
    return {
      id: comanda.id,
      numero: comanda.numero,
      status: comanda.status,
      card_id: comanda.cardId,
      card_uid: comanda.card?.uidNfc,
      card_token: comanda.cardToken ?? comanda.card?.sessionToken ?? null,
      customer_id: comanda.customerId ?? comanda.card?.customerId ?? null,
      cliente_nome: comanda.card?.clienteNome,
      cliente_cpf: comanda.card?.customer?.cpf ?? null,
      cliente_telefone: comanda.card?.customer?.telefone ?? null,
      event_id: comanda.eventId,
      subtotal: Number(comanda.subtotal),
      desconto: Number(comanda.desconto),
      total,
      total_pago: totalPago,
      restante: Math.max(0, Number((total - totalPago).toFixed(2))),
      observacao: comanda.observacao,
      criado_em: comanda.criadoEm,
      fechada_em: comanda.fechadaEm,
      paga_em: comanda.pagaEm,
      itens: (comanda.items || []).map((item) => ({
        id: item.id,
        produto_id: item.produtoId,
        nome: item.nome,
        qtd: item.qtd,
        preco_unit: Number(item.precoUnit),
        total: Number(item.total),
        observacao: item.observacao,
        criado_em: item.criadoEm,
      })),
      pagamentos: (comanda.payments || []).map((p) => ({
        id: p.id,
        forma: p.forma,
        valor: Number(p.valor),
        status: p.status,
        gateway: p.gateway,
        referencia_externa: p.referenciaExterna,
        criado_em: p.criadoEm,
      })),
    };
  }

  async findOne(tenantId: string, id: string) {
    const comanda = await this.comandasRepo.findOne({
      where: { id, tenantId },
      relations: { items: true, payments: true, card: { customer: true } },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.items) {
      comanda.items.sort(
        (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime(),
      );
    }
    return this.serialize(comanda);
  }

  async listOpen(tenantId: string) {
    const list = await this.comandasRepo.find({
      where: {
        tenantId,
        status: In([ComandaStatus.OPEN, ComandaStatus.PENDING_PAYMENT]),
      },
      relations: { items: true, payments: true, card: true },
      order: { atualizadoEm: 'DESC' },
    });
    return list.map((c) => this.serialize(c));
  }

  async getOpenByCard(tenantId: string, cardId: string) {
    return this.comandasRepo.findOne({
      where: {
        tenantId,
        cardId,
        status: In([ComandaStatus.OPEN, ComandaStatus.PENDING_PAYMENT]),
      },
      relations: { items: true, payments: true, card: true },
      order: { atualizadoEm: 'DESC' },
    });
  }

  /** Aproximação NFC: localiza cartão e abre/retorna comanda ativa */
  async nfcTap(tenantId: string, dto: NfcTapDto, operadorId?: string) {
    const card = await this.cardsService.findByUid(tenantId, dto.uid_nfc);
    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException('Cartão bloqueado ou inativo');
    }

    let comanda = await this.getOpenByCard(tenantId, card.id);
    let created = false;

    if (!comanda) {
      comanda = await this.openComanda(tenantId, card, dto.event_id, operadorId);
      created = true;
    }

    const saldo = await this.cardsService.getAvailableBalance(card);
    const serialized = await this.findOne(tenantId, comanda.id);

    await this.integrations.emitEvent(tenantId, 'comanda.nfc_tap', {
      card_uid: card.uidNfc,
      comanda_id: comanda.id,
      created,
    });

    return {
      acao: created ? 'comanda_aberta' : 'comanda_existente',
      cartao: {
        uid: card.uidNfc,
        nome: card.clienteNome,
        status: card.status,
        saldo_disponivel: saldo,
        session_token: card.sessionToken,
        customer_id: card.customerId,
      },
      comanda: serialized,
      formas_pagamento: Object.values(PaymentMethod),
    };
  }

  private async openComanda(
    tenantId: string,
    card: {
      id: string;
      eventId: string;
      uidNfc: string;
      customerId?: string | null;
      sessionToken?: string | null;
    },
    eventId?: string,
    operadorId?: string,
  ) {
    const numero = await this.nextNumero(tenantId);
    const comanda = this.comandasRepo.create({
      tenantId,
      cardId: card.id,
      customerId: card.customerId ?? null,
      cardToken: card.sessionToken ?? null,
      eventId: eventId ?? card.eventId ?? null,
      numero,
      status: ComandaStatus.OPEN,
      subtotal: 0,
      desconto: 0,
      total: 0,
      totalPago: 0,
      abertaPor: operadorId ?? null,
    });
    const saved = await this.comandasRepo.save(comanda);
    await this.integrations.emitEvent(tenantId, 'comanda.opened', {
      comanda_id: saved.id,
      card_uid: card.uidNfc,
      numero: saved.numero,
    });
    return saved;
  }

  async addItems(
    tenantId: string,
    comandaId: string,
    dto: AddComandaItemsDto,
  ) {
    const comanda = await this.comandasRepo.findOne({
      where: { id: comandaId, tenantId },
      relations: { items: true, card: true },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status !== ComandaStatus.OPEN) {
      throw new BadRequestException(
        'Só é possível adicionar itens em comanda aberta. Reabra após o pagamento.',
      );
    }

    for (const input of dto.itens) {
      const product = await this.productsRepo.findOne({
        where: { id: input.produto_id, tenantId, ativo: true },
      });
      if (!product) {
        throw new BadRequestException(`Produto ${input.produto_id} inválido`);
      }

      const existing = (comanda.items || []).find(
        (i) => i.produtoId === product.id && !i.observacao && !input.observacao,
      );

      if (existing) {
        existing.qtd += input.qtd;
        existing.total = Number(existing.precoUnit) * existing.qtd;
        await this.itemsRepo.save(existing);
      } else {
        const item = this.itemsRepo.create({
          comandaId: comanda.id,
          produtoId: product.id,
          nome: product.nome,
          qtd: input.qtd,
          precoUnit: product.preco,
          total: Number(product.preco) * input.qtd,
          observacao: input.observacao ?? null,
        });
        await this.itemsRepo.save(item);
      }
    }

    await this.recalcTotals(comanda.id);
    const result = await this.findOne(tenantId, comanda.id);
    await this.integrations.emitEvent(tenantId, 'comanda.items_added', {
      comanda_id: comanda.id,
      itens: dto.itens,
      total: result.total,
    });
    return result;
  }

  async removeItem(tenantId: string, comandaId: string, itemId: string) {
    const comanda = await this.comandasRepo.findOne({
      where: { id: comandaId, tenantId },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status !== ComandaStatus.OPEN) {
      throw new BadRequestException('Comanda não está aberta');
    }

    const item = await this.itemsRepo.findOne({
      where: { id: itemId, comandaId },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    await this.itemsRepo.remove(item);
    await this.recalcTotals(comandaId);
    return this.findOne(tenantId, comandaId);
  }

  private async recalcTotals(comandaId: string) {
    const comanda = await this.comandasRepo.findOne({
      where: { id: comandaId },
      relations: { items: true },
    });
    if (!comanda) return;
    const subtotal = (comanda.items || []).reduce(
      (sum, i) => sum + Number(i.total),
      0,
    );
    comanda.subtotal = subtotal;
    comanda.total = Math.max(0, subtotal - Number(comanda.desconto));
    await this.comandasRepo.save(comanda);
  }

  /** Solicita fechamento — comanda fica pendente de pagamento e não aceita mais itens */
  async close(tenantId: string, comandaId: string, dto: CloseComandaDto, operadorId?: string) {
    const comanda = await this.comandasRepo.findOne({
      where: { id: comandaId, tenantId },
      relations: { items: true },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status !== ComandaStatus.OPEN) {
      throw new BadRequestException('Comanda já foi fechada ou paga');
    }
    if (!comanda.items?.length) {
      throw new BadRequestException('Comanda sem itens');
    }

    comanda.desconto = dto.desconto ?? Number(comanda.desconto);
    comanda.total = Math.max(0, Number(comanda.subtotal) - Number(comanda.desconto));
    comanda.status = ComandaStatus.PENDING_PAYMENT;
    comanda.fechadaEm = new Date();
    comanda.fechadaPor = operadorId ?? null;
    comanda.observacao = dto.observacao ?? comanda.observacao;
    await this.comandasRepo.save(comanda);

    const result = await this.findOne(tenantId, comandaId);
    await this.integrations.emitEvent(tenantId, 'comanda.closed', {
      comanda_id: comandaId,
      total: result.total,
    });
    return result;
  }

  /** Reabre comanda pendente de pagamento para adicionar mais itens */
  async reopen(tenantId: string, comandaId: string) {
    const comanda = await this.comandasRepo.findOne({
      where: { id: comandaId, tenantId },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status !== ComandaStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Só é possível reabrir comanda aguardando pagamento');
    }
    if (Number(comanda.totalPago) > 0) {
      throw new BadRequestException('Já houve pagamento parcial — não é possível reabrir');
    }
    comanda.status = ComandaStatus.OPEN;
    comanda.fechadaEm = null;
    comanda.fechadaPor = null;
    await this.comandasRepo.save(comanda);
    return this.findOne(tenantId, comandaId);
  }

  /** Pagamento — só libera o cartão para nova comanda após quitação total */
  async pay(tenantId: string, comandaId: string, dto: PayComandaDto, operadorId?: string) {
    const comanda = await this.comandasRepo.findOne({
      where: { id: comandaId, tenantId },
      relations: { items: true, card: true },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (
      comanda.status !== ComandaStatus.PENDING_PAYMENT &&
      comanda.status !== ComandaStatus.OPEN
    ) {
      throw new BadRequestException('Comanda não está disponível para pagamento');
    }
    if (comanda.status === ComandaStatus.OPEN) {
      if (!comanda.items?.length) {
        throw new BadRequestException('Comanda sem itens');
      }
      await this.comandasRepo.update(
        { id: comanda.id },
        {
          status: ComandaStatus.PENDING_PAYMENT,
          fechadaEm: new Date(),
          fechadaPor: operadorId ?? null,
        },
      );
      comanda.status = ComandaStatus.PENDING_PAYMENT;
    }

    // Recalcula a partir dos pagamentos já confirmados (evita inconsistência)
    const pagosAnteriores = await this.paymentsRepo.find({
      where: { comandaId: comanda.id, status: PaymentStatus.CONFIRMED },
    });
    const jaPago = pagosAnteriores.reduce((s, p) => s + Number(p.valor), 0);
    const total = Number(comanda.total);
    const restanteAntes = Number((total - jaPago).toFixed(2));
    const somaPagamentos = dto.pagamentos.reduce((s, p) => s + Number(p.valor), 0);

    if (restanteAntes <= 0) {
      await this.comandasRepo.update(
        { id: comanda.id },
        { totalPago: total, status: ComandaStatus.PAID, pagaEm: new Date() },
      );
      const already = await this.findOne(tenantId, comandaId);
      return {
        ...already,
        liberado_para_nova_comanda: true,
        mensagem: 'Comanda já estava quitada. Cartão liberado para nova comanda.',
      };
    }

    if (somaPagamentos <= 0) {
      throw new BadRequestException('Informe ao menos um pagamento');
    }
    if (somaPagamentos > restanteAntes + 0.009) {
      throw new BadRequestException(
        `Valor dos pagamentos (R$ ${somaPagamentos.toFixed(2)}) excede o restante (R$ ${restanteAntes.toFixed(2)})`,
      );
    }

    for (const pag of dto.pagamentos) {
      if (pag.forma === PaymentMethod.SALDO_PULSEIRA) {
        if (!comanda.card?.uidNfc) {
          throw new BadRequestException('Cartão da comanda não encontrado');
        }
        const card = await this.cardsService.findByUid(tenantId, comanda.card.uidNfc);
        const disponivel = await this.cardsService.getAvailableBalance(card);
        if (disponivel < pag.valor) {
          throw new BadRequestException(
            `Saldo da pulseira insuficiente (R$ ${disponivel.toFixed(2)})`,
          );
        }
        const reserve = await this.cardsService.reserve(tenantId, card.uidNfc, {
          valor: pag.valor,
          transacao_id: uuidv4(),
          pdv_id: 'comanda',
        });
        await this.cardsService.confirm(tenantId, card.uidNfc, {
          reserva_id: reserve.reserva_id,
          itens: (comanda.items || []).map((i) => ({
            produto_id: i.produtoId,
            qtd: i.qtd,
            preco_unit: Number(i.precoUnit),
          })),
          pdv_id: 'comanda',
        });
      }
    }

    for (const pag of dto.pagamentos) {
      await this.paymentsRepo.save(
        this.paymentsRepo.create({
          comandaId: comanda.id,
          forma: pag.forma,
          valor: pag.valor,
          status: PaymentStatus.CONFIRMED,
          referenciaExterna: pag.referencia_externa ?? null,
          gateway: pag.gateway ?? String(pag.forma),
          operadorId: operadorId ?? null,
        }),
      );
    }

    const novoTotalPago = Number((jaPago + somaPagamentos).toFixed(2));
    const pagoTotal = novoTotalPago >= total - 0.009;

    await this.comandasRepo.update(
      { id: comanda.id },
      {
        totalPago: pagoTotal ? total : novoTotalPago,
        status: pagoTotal ? ComandaStatus.PAID : ComandaStatus.PENDING_PAYMENT,
        pagaEm: pagoTotal ? new Date() : null,
      },
    );

    const result = await this.findOne(tenantId, comandaId);
    try {
      await this.integrations.emitEvent(tenantId, 'comanda.payment', {
        comanda_id: comandaId,
        status: result.status,
        total_pago: result.total_pago,
        restante: result.restante,
        pagamentos: dto.pagamentos,
      });

      if (result.status === 'paid') {
        await this.integrations.emitEvent(tenantId, 'comanda.paid', {
          comanda_id: comandaId,
          card_uid: result.card_uid,
          total: result.total,
        });
      }
    } catch {
      // webhooks não devem falhar o pagamento
    }

    return {
      ...result,
      liberado_para_nova_comanda: result.status === 'paid',
      mensagem:
        result.status === 'paid'
          ? 'Comanda paga. Cartão liberado para nova comanda.'
          : `Pagamento parcial registrado. Restante: R$ ${result.restante.toFixed(2)}`,
    };
  }

  async cancel(tenantId: string, comandaId: string) {
    const comanda = await this.comandasRepo.findOne({
      where: { id: comandaId, tenantId },
      relations: { payments: true },
    });
    if (!comanda) throw new NotFoundException('Comanda não encontrada');
    if (comanda.status === ComandaStatus.PAID) {
      throw new BadRequestException('Não é possível cancelar comanda paga');
    }
    if ((comanda.payments || []).some((p) => p.status === PaymentStatus.CONFIRMED)) {
      throw new BadRequestException('Há pagamentos confirmados — estorne antes de cancelar');
    }
    comanda.status = ComandaStatus.CANCELLED;
    await this.comandasRepo.save(comanda);
    await this.integrations.emitEvent(tenantId, 'comanda.cancelled', {
      comanda_id: comandaId,
    });
    return this.findOne(tenantId, comandaId);
  }

  paymentMethods() {
    return [
      { id: PaymentMethod.DINHEIRO, label: 'Dinheiro' },
      { id: PaymentMethod.PIX, label: 'PIX' },
      { id: PaymentMethod.CREDITO, label: 'Cartão de Crédito' },
      { id: PaymentMethod.DEBITO, label: 'Cartão de Débito' },
      { id: PaymentMethod.SALDO_PULSEIRA, label: 'Saldo da Pulseira' },
      { id: PaymentMethod.CORTESIA, label: 'Cortesia' },
      { id: PaymentMethod.OUTRO, label: 'Outro' },
    ];
  }
}
