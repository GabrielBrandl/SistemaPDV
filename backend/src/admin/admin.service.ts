import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Card,
  CardStatus,
  Comanda,
  ComandaStatus,
  ExitRelease,
  Product,
  User,
} from '../database/entities';
import { ExitService } from '../exit/exit.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Comanda) private readonly comandasRepo: Repository<Comanda>,
    @InjectRepository(Card) private readonly cardsRepo: Repository<Card>,
    @InjectRepository(ExitRelease) private readonly exitsRepo: Repository<ExitRelease>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly exitService: ExitService,
  ) {}

  async overview(tenantId: string) {
    const [
      comandasAbertas,
      aguardandoPagamento,
      pagas,
      cartoesAtivos,
      cartoesSaida,
      liberacoesHoje,
      bloqueados,
      usuarios,
      produtos,
    ] = await Promise.all([
      this.comandasRepo.count({
        where: { tenantId, status: ComandaStatus.OPEN },
      }),
      this.comandasRepo.count({
        where: { tenantId, status: ComandaStatus.PENDING_PAYMENT },
      }),
      this.comandasRepo.count({
        where: { tenantId, status: ComandaStatus.PAID },
      }),
      this.cardsRepo.count({ where: { tenantId, status: CardStatus.ACTIVE } }),
      this.cardsRepo.count({ where: { tenantId, status: CardStatus.EXITED } }),
      this.exitService.listToday(tenantId),
      this.exitService.listBlocked(tenantId),
      this.usersRepo.find({
        where: { tenantId },
        select: ['id', 'name', 'email', 'role', 'criadoEm'],
        order: { name: 'ASC' },
      }),
      this.productsRepo.count({ where: { tenantId, ativo: true } }),
    ]);

    const pendingValue = bloqueados.reduce((s, b) => s + b.pendencia, 0);
    const vendasPagas = await this.comandasRepo.find({
      where: { tenantId, status: ComandaStatus.PAID },
    });
    const faturamento = vendasPagas.reduce((s, c) => s + Number(c.total), 0);

    return {
      kpis: {
        comandas_abertas: comandasAbertas,
        aguardando_pagamento: aguardandoPagamento,
        comandas_pagas: pagas,
        faturamento,
        pendencia_saida: pendingValue,
        cartoes_ativos: cartoesAtivos,
        cartoes_recolhidos: cartoesSaida,
        liberacoes_hoje: liberacoesHoje.length,
        produtos_ativos: produtos,
      },
      pendencias_saida: bloqueados,
      liberacoes_hoje: liberacoesHoje.slice(0, 20).map((e) => ({
        id: e.id,
        card_uid: e.cardUid,
        cliente_nome: e.clienteNome,
        status: e.status,
        total_consumido: Number(e.totalConsumido),
        pendencia: Number(e.pendencia),
        liberado_em: e.liberadoEm,
      })),
      usuarios: usuarios.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
      fluxo: {
        consumo: 'Cliente aproxima cartão no bar → itens na comanda (sem pagar ainda)',
        pagamento: 'No caixa/saída: fecha comanda e paga PIX, débito ou crédito',
        saida: 'Pessoa da saída aproxima cartão → só libera se não houver pendência',
      },
    };
  }

  async recentComandas(tenantId: string) {
    const list = await this.comandasRepo.find({
      where: {
        tenantId,
        status: In([
          ComandaStatus.OPEN,
          ComandaStatus.PENDING_PAYMENT,
          ComandaStatus.PAID,
        ]),
      },
      relations: { card: true },
      order: { atualizadoEm: 'DESC' },
      take: 30,
    });
    return list.map((c) => ({
      id: c.id,
      numero: c.numero,
      status: c.status,
      total: Number(c.total),
      total_pago: Number(c.totalPago),
      restante: Math.max(0, Number(c.total) - Number(c.totalPago)),
      card_uid: c.card?.uidNfc,
      cliente: c.card?.clienteNome,
      atualizado_em: c.atualizadoEm,
    }));
  }
}
