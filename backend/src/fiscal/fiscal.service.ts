import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NfceDocument,
  NfceStatus,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Tenant,
} from '../database/entities';
import { EmitNfceDto } from './dto/emit-nfce.dto';
import { FocusNfeProvider } from './focus-nfe.provider';

@Injectable()
export class FiscalService {
  constructor(
    @InjectRepository(NfceDocument)
    private readonly nfceRepo: Repository<NfceDocument>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    private readonly focusNfe: FocusNfeProvider,
  ) {}

  private async getTenant(tenantId: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async getStatus(tenantId: string) {
    const tenant = await this.getTenant(tenantId);
    return {
      tenant_id: tenant.id,
      provider: this.focusNfe.isConfigured(tenant)
        ? 'focus_nfe'
        : 'local_homologacao',
      configurado: this.focusNfe.isConfigured(tenant),
      cnpj: tenant.cnpj,
      ambiente: tenant.focusNfeAmbiente,
      mensagem: this.focusNfe.isConfigured(tenant)
        ? 'Focus NFe configurada neste tenant'
        : 'Modo homologação local — configure o token Focus NFe no tenant',
    };
  }

  async listPaidOrdersWithoutNfce(tenantId: string) {
    const orders = await this.ordersRepo.find({
      where: { status: OrderStatus.PAID, tenantId },
      relations: { items: { produto: true }, nfceDocuments: true },
      order: { criadoEm: 'DESC' },
      take: 50,
    });

    return orders
      .filter(
        (order) =>
          !order.nfceDocuments?.some((d) => d.status === NfceStatus.AUTHORIZED),
      )
      .map((order) => ({
        id: order.id,
        total: Number(order.total),
        criado_em: order.criadoEm,
        itens: order.items?.map((item) => ({
          produto: item.produto?.nome,
          qtd: item.qtd,
          preco_unit: Number(item.precoUnit),
          total: Number(item.total),
        })),
      }));
  }

  async emit(tenantId: string, dto: EmitNfceDto) {
    const tenant = await this.getTenant(tenantId);
    const order = await this.ordersRepo.findOne({
      where: { id: dto.order_id, tenantId },
      relations: { items: { produto: true }, nfceDocuments: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Só é possível emitir NFC-e de pedidos pagos');
    }
    if (!order.items?.length) {
      throw new BadRequestException('Pedido sem itens');
    }

    const existing = order.nfceDocuments?.find(
      (d) => d.status === NfceStatus.AUTHORIZED,
    );
    if (existing && !dto.forcar_reemissao) {
      throw new BadRequestException(
        'Já existe NFC-e autorizada para este pedido. Use forcar_reemissao=true para reemitir.',
      );
    }

    const doc = this.nfceRepo.create({
      tenantId,
      orderId: order.id,
      status: NfceStatus.PENDING,
      clienteCpf: dto.cliente_cpf ?? null,
      clienteNome: dto.cliente_nome ?? null,
      valor: Number(order.total),
      serie: tenant.nfceSerie || 1,
    });
    const saved = await this.nfceRepo.save(doc);

    const result = await this.focusNfe.emit(tenant, {
      referencia: saved.id,
      cliente_cpf: dto.cliente_cpf,
      cliente_nome: dto.cliente_nome,
      valor_total: Number(order.total),
      itens: order.items.map((item) => ({
        codigo: item.produtoId.slice(0, 8),
        descricao: item.produto?.nome || 'Produto',
        quantidade: item.qtd,
        valor_unitario: Number(item.precoUnit),
      })),
    });

    if (!result.sucesso) {
      saved.status = NfceStatus.FAILED;
      saved.mensagemErro = result.mensagem_erro ?? 'Falha na emissão';
      saved.ambiente = result.ambiente;
      await this.nfceRepo.save(saved);
      throw new BadRequestException(saved.mensagemErro);
    }

    saved.status = NfceStatus.AUTHORIZED;
    saved.chaveAcesso = result.chave_acesso ?? null;
    saved.protocolo = result.protocolo ?? null;
    saved.numero = result.numero ?? null;
    saved.serie = result.serie ?? tenant.nfceSerie ?? 1;
    saved.xml = result.xml ?? null;
    saved.ambiente = result.ambiente;
    saved.danfeUrl = result.danfe_url || `/api/v1/fiscal/nfce/${saved.id}/danfe`;
    saved.mensagemErro = null;
    return this.nfceRepo.save(saved);
  }

  findAll(tenantId: string) {
    return this.nfceRepo.find({
      where: { tenantId },
      relations: { order: true },
      order: { emitidoEm: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const doc = await this.nfceRepo.findOne({
      where: { id, tenantId },
      relations: { order: { items: { produto: true } } },
    });
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    return doc;
  }

  async getXml(tenantId: string, id: string) {
    const doc = await this.findOne(tenantId, id);
    if (!doc.xml) throw new NotFoundException('XML não disponível');
    return doc.xml;
  }

  async getDanfeHtml(tenantId: string | null, id: string) {
    const doc = tenantId
      ? await this.findOne(tenantId, id)
      : await this.nfceRepo.findOne({
          where: { id },
          relations: { order: { items: { produto: true } } },
        });
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');

    const itens =
      doc.order?.items
        ?.map(
          (item) =>
            `<tr>
              <td>${item.produto?.nome ?? item.produtoId}</td>
              <td style="text-align:center">${item.qtd}</td>
              <td style="text-align:right">R$ ${Number(item.precoUnit).toFixed(2)}</td>
              <td style="text-align:right">R$ ${Number(item.total).toFixed(2)}</td>
            </tr>`,
        )
        .join('') || '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>DANFE NFC-e ${doc.numero ?? ''}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 420px; margin: 24px auto; color: #111; }
    h1 { font-size: 16px; margin: 0 0 8px; }
    .muted { color: #555; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border-bottom: 1px solid #ddd; padding: 6px 2px; }
    .box { border: 1px solid #ccc; padding: 12px; border-radius: 8px; }
    .total { font-size: 18px; font-weight: bold; margin-top: 12px; }
    .chave { word-break: break-all; font-family: monospace; font-size: 11px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>DANFE NFC-e — Documento Auxiliar</h1>
    <p class="muted">Ambiente: ${doc.ambiente} · Status: ${doc.status}</p>
    <p><strong>Número:</strong> ${doc.numero ?? '—'} / Série ${doc.serie}</p>
    <p><strong>Protocolo:</strong> ${doc.protocolo ?? '—'}</p>
    <p><strong>CPF:</strong> ${doc.clienteCpf ?? 'Não informado'}</p>
    <p class="chave"><strong>Chave:</strong> ${doc.chaveAcesso ?? '—'}</p>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Item</th>
          <th>Qtd</th>
          <th style="text-align:right">Unit.</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${itens}</tbody>
    </table>
    <p class="total">Total: R$ ${Number(doc.valor).toFixed(2)}</p>
    <p class="muted">Emitido em ${new Date(doc.emitidoEm).toLocaleString('pt-BR')}</p>
  </div>
</body>
</html>`;
  }

  async createDemoPaidOrder(tenantId: string) {
    const products = await this.ordersRepo.manager
      .getRepository(Product)
      .find({ where: { ativo: true, tenantId }, take: 2 });

    if (!products.length) {
      throw new BadRequestException('Nenhum produto cadastrado para gerar pedido demo');
    }

    const order = this.ordersRepo.create({
      tenantId,
      status: OrderStatus.PAID,
      total: 0,
    });
    const savedOrder = await this.ordersRepo.save(order);

    let total = 0;
    for (const p of products) {
      const qtd = 1;
      const line = Number(p.preco) * qtd;
      total += line;
      await this.ordersRepo.manager.getRepository(OrderItem).save({
        orderId: savedOrder.id,
        produtoId: p.id,
        qtd,
        precoUnit: p.preco,
        total: line,
      });
    }

    savedOrder.total = total;
    await this.ordersRepo.save(savedOrder);

    const pending = await this.listPaidOrdersWithoutNfce(tenantId);
    return pending.find((o) => o.id === savedOrder.id);
  }

  async cancel(tenantId: string, id: string) {
    const doc = await this.findOne(tenantId, id);
    if (doc.status !== NfceStatus.AUTHORIZED) {
      throw new BadRequestException('Só é possível cancelar NFC-e autorizada');
    }
    doc.status = NfceStatus.CANCELLED;
    return this.nfceRepo.save(doc);
  }
}
