import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Card,
  CardStatus,
  Comanda,
  ComandaStatus,
  ExitRelease,
  ExitStatus,
} from '../database/entities';
import { CardsService } from '../cards/cards.service';

@Injectable()
export class ExitService {
  constructor(
    @InjectRepository(ExitRelease)
    private readonly exitsRepo: Repository<ExitRelease>,
    @InjectRepository(Comanda)
    private readonly comandasRepo: Repository<Comanda>,
    @InjectRepository(Card)
    private readonly cardsRepo: Repository<Card>,
    private readonly cardsService: CardsService,
  ) {}

  async check(tenantId: string, uidNfc: string) {
    const card = await this.cardsService.findByUid(tenantId, uidNfc);

    const openOrPending = await this.comandasRepo.find({
      where: {
        tenantId,
        cardId: card.id,
        status: In([ComandaStatus.OPEN, ComandaStatus.PENDING_PAYMENT]),
      },
      relations: { items: true, payments: true },
      order: { criadoEm: 'DESC' },
    });

    // Comanda aberta vazia não impede saída (fecha automaticamente na liberação)
    const relevantPending = openOrPending.filter((c) => {
      if (c.status === ComandaStatus.PENDING_PAYMENT) {
        return Math.max(0, Number(c.total) - Number(c.totalPago)) > 0.009;
      }
      return Number(c.total) > 0.009 || (c.items?.length ?? 0) > 0;
    });

    const paidComandas = await this.comandasRepo.find({
      where: { tenantId, cardId: card.id, status: ComandaStatus.PAID },
    });

    const totalConsumido = paidComandas.reduce((s, c) => s + Number(c.total), 0);
    const pendencia = relevantPending.reduce((s, c) => {
      if (c.status === ComandaStatus.OPEN) return s + Number(c.total);
      return s + Math.max(0, Number(c.total) - Number(c.totalPago));
    }, 0);

    const lastExit = await this.exitsRepo.findOne({
      where: { tenantId, cardId: card.id, status: In([ExitStatus.RELEASED, ExitStatus.FORCED]) },
      order: { liberadoEm: 'DESC' },
    });

    const hasDebt = pendencia > 0.009 || relevantPending.length > 0;
    const alreadyExited = card.status === CardStatus.EXITED;

    let decisao: 'liberar' | 'bloquear' | 'ja_liberado' = 'liberar';
    let mensagem = 'Conta quitada. Pode liberar a saída e recolher o cartão.';

    if (alreadyExited && !hasDebt) {
      decisao = 'ja_liberado';
      mensagem = 'Este cartão já foi liberado na saída.';
    } else if (hasDebt) {
      decisao = 'bloquear';
      const abertas = relevantPending.filter((c) => c.status === ComandaStatus.OPEN).length;
      const pendentes = relevantPending.filter(
        (c) => c.status === ComandaStatus.PENDING_PAYMENT,
      ).length;
      mensagem = `NÃO LIBERAR — há pendência de R$ ${pendencia.toFixed(2)}.`;
      if (abertas) mensagem += ` ${abertas} comanda(s) ainda aberta(s).`;
      if (pendentes) mensagem += ` ${pendentes} aguardando pagamento.`;
      mensagem += ' Oriente o cliente a pagar no caixa antes de sair.';
    }

    return {
      decisao,
      pode_liberar: decisao === 'liberar',
      mensagem,
      cartao: {
        id: card.id,
        uid: card.uidNfc,
        nome: card.clienteNome,
        status: card.status,
      },
      resumo: {
        total_consumido: totalConsumido,
        pendencia,
        comandas_pagas: paidComandas.length,
        comandas_abertas: relevantPending.filter((c) => c.status === ComandaStatus.OPEN)
          .length,
        comandas_aguardando_pagamento: relevantPending.filter(
          (c) => c.status === ComandaStatus.PENDING_PAYMENT,
        ).length,
      },
      comandas_pendentes: relevantPending.map((c) => ({
        id: c.id,
        numero: c.numero,
        status: c.status,
        total: Number(c.total),
        total_pago: Number(c.totalPago),
        restante: Math.max(0, Number(c.total) - Number(c.totalPago)),
        itens: (c.items || []).map((i) => ({
          nome: i.nome,
          qtd: i.qtd,
          total: Number(i.total),
        })),
      })),
      ultima_liberacao: lastExit
        ? {
            id: lastExit.id,
            liberado_em: lastExit.liberadoEm,
            status: lastExit.status,
          }
        : null,
    };
  }

  async release(
    tenantId: string,
    uidNfc: string,
    operadorId?: string,
    opts?: { forcar?: boolean; observacao?: string },
  ) {
    const check = await this.check(tenantId, uidNfc);

    if (check.decisao === 'ja_liberado' && !opts?.forcar) {
      throw new BadRequestException('Cartão já foi liberado na saída');
    }

    if (check.decisao === 'bloquear' && !opts?.forcar) {
      throw new BadRequestException(check.mensagem);
    }

    if (opts?.forcar && check.decisao === 'bloquear' && !opts.observacao) {
      throw new BadRequestException(
        'Informe uma observação para liberação forçada com pendência',
      );
    }

    const card = await this.cardsRepo.findOne({ where: { id: check.cartao.id } });
    if (!card) throw new NotFoundException('Cartão não encontrado');

    // Cancela comandas abertas vazias residualmente
    await this.comandasRepo
      .createQueryBuilder()
      .update(Comanda)
      .set({ status: ComandaStatus.CANCELLED })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('card_id = :cardId', { cardId: card.id })
      .andWhere('status = :status', { status: ComandaStatus.OPEN })
      .andWhere('total <= :zero', { zero: 0.009 })
      .execute();

    const release = this.exitsRepo.create({
      tenantId,
      cardId: card.id,
      cardUid: card.uidNfc,
      clienteNome: card.clienteNome,
      status: opts?.forcar && check.decisao === 'bloquear' ? ExitStatus.FORCED : ExitStatus.RELEASED,
      totalConsumido: check.resumo.total_consumido,
      comandasPagas: check.resumo.comandas_pagas,
      pendencia: check.resumo.pendencia,
      operadorId: operadorId ?? null,
      observacao: opts?.observacao ?? null,
    });
    const saved = await this.exitsRepo.save(release);

    card.status = CardStatus.EXITED;
    await this.cardsRepo.save(card);

    return {
      liberado: true,
      status: saved.status,
      mensagem:
        saved.status === ExitStatus.FORCED
          ? 'Saída liberada COM RESSALVA (forçada). Recolha o cartão.'
          : 'Saída liberada. Recolha o cartão do cliente.',
      liberacao: {
        id: saved.id,
        card_uid: saved.cardUid,
        cliente_nome: saved.clienteNome,
        liberado_em: saved.liberadoEm,
        total_consumido: Number(saved.totalConsumido),
        pendencia: Number(saved.pendencia),
      },
    };
  }

  async listToday(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.exitsRepo
      .createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.liberadoEm >= :start', { start })
      .orderBy('e.liberadoEm', 'DESC')
      .getMany();
  }

  async listBlocked(tenantId: string) {
    const pending = await this.comandasRepo.find({
      where: {
        tenantId,
        status: In([ComandaStatus.OPEN, ComandaStatus.PENDING_PAYMENT]),
      },
      relations: { card: true, items: true },
      order: { atualizadoEm: 'DESC' },
    });

    const byCard = new Map<
      string,
      {
        card_uid: string;
        cliente_nome: string | null;
        pendencia: number;
        comandas: number;
      }
    >();

    for (const c of pending) {
      const restante =
        c.status === ComandaStatus.OPEN
          ? Number(c.total)
          : Math.max(0, Number(c.total) - Number(c.totalPago));
      if (restante <= 0.009 && (c.items?.length ?? 0) === 0) continue;

      const uid = c.card?.uidNfc || c.cardId;
      const current = byCard.get(uid) || {
        card_uid: uid,
        cliente_nome: c.card?.clienteNome ?? null,
        pendencia: 0,
        comandas: 0,
      };
      current.pendencia += restante;
      current.comandas += 1;
      byCard.set(uid, current);
    }

    return Array.from(byCard.values()).sort((a, b) => b.pendencia - a.pendencia);
  }

  /** Reativa cartão recolhido para novo uso no evento */
  async reactivateCard(tenantId: string, uidNfc: string) {
    const card = await this.cardsService.findByUid(tenantId, uidNfc);
    const open = await this.comandasRepo.count({
      where: {
        tenantId,
        cardId: card.id,
        status: In([ComandaStatus.OPEN, ComandaStatus.PENDING_PAYMENT]),
      },
    });
    if (open > 0) {
      throw new BadRequestException('Cartão ainda possui comanda em aberto');
    }
    card.status = CardStatus.ACTIVE;
    await this.cardsRepo.save(card);
    return { uid: card.uidNfc, status: card.status, mensagem: 'Cartão reativado' };
  }
}
