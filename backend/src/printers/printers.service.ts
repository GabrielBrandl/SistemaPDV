import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createConnection } from 'net';
import { Repository } from 'typeorm';
import {
  Order,
  Printer,
  PrinterStation,
  Product,
} from '../database/entities';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { buildTicket } from './escpos.util';

@Injectable()
export class PrintersService {
  private readonly logger = new Logger(PrintersService.name);

  constructor(
    @InjectRepository(Printer)
    private readonly printersRepo: Repository<Printer>,
  ) {}

  list(tenantId: string) {
    return this.printersRepo.find({
      where: { tenantId },
      order: { station: 'ASC', nome: 'ASC' },
    });
  }

  async create(tenantId: string, dto: CreatePrinterDto) {
    const printer = this.printersRepo.create({
      tenantId,
      nome: dto.nome.trim(),
      station: dto.station,
      host: dto.host.trim(),
      port: dto.port ?? 9100,
      ativo: dto.ativo ?? true,
      protocol: dto.protocol || 'escpos_tcp',
    });
    return this.printersRepo.save(printer);
  }

  async update(tenantId: string, id: string, dto: UpdatePrinterDto) {
    const printer = await this.findOne(tenantId, id);
    if (dto.nome != null) printer.nome = dto.nome.trim();
    if (dto.station != null) printer.station = dto.station;
    if (dto.host != null) printer.host = dto.host.trim();
    if (dto.port != null) printer.port = dto.port;
    if (dto.ativo != null) printer.ativo = dto.ativo;
    if (dto.protocol != null) printer.protocol = dto.protocol;
    return this.printersRepo.save(printer);
  }

  async remove(tenantId: string, id: string) {
    const printer = await this.findOne(tenantId, id);
    await this.printersRepo.remove(printer);
    return { ok: true };
  }

  async findOne(tenantId: string, id: string) {
    const printer = await this.printersRepo.findOne({ where: { id, tenantId } });
    if (!printer) throw new NotFoundException('Impressora não encontrada');
    return printer;
  }

  async testPrint(tenantId: string, id: string) {
    const printer = await this.findOne(tenantId, id);
    const payload = buildTicket({
      title: 'PDV CASHLESS',
      station: printer.station,
      orderId: 'TESTE000',
      lines: [{ qty: 1, name: 'Teste de impressao' }],
      footer: printer.nome,
    });
    await this.send(printer, payload);
    return { ok: true, printer: printer.nome, host: printer.host, port: printer.port };
  }

  /**
   * Após checkout: ticket de preparo (BAR/COZINHA) + recibo CAIXA.
   * Falhas de rede não quebram o pedido (log + retorno parcial).
   */
  async printOrderPaid(tenantId: string, order: Order) {
    const printers = await this.printersRepo.find({
      where: { tenantId, ativo: true },
    });
    if (!printers.length) {
      return { printed: [], skipped: 'nenhuma impressora ativa' };
    }

    const items = (order.items || []).map((i) => ({
      qty: i.qtd,
      name: i.produto?.nome || i.produtoId.slice(0, 8),
      station: resolveStation(i.produto),
    }));

    const results: { station: string; printer: string; ok: boolean; error?: string }[] = [];

    for (const station of [PrinterStation.BAR, PrinterStation.COZINHA] as const) {
      const stationItems = items.filter((i) => i.station === station);
      if (!stationItems.length) continue;
      const targets = printers.filter((p) => p.station === station);
      const ticket = buildTicket({
        title: 'PDV CASHLESS',
        station: station === PrinterStation.BAR ? 'BAR' : 'COZINHA',
        orderId: order.id,
        lines: stationItems.map((i) => ({ qty: i.qty, name: i.name })),
      });
      for (const p of targets) {
        try {
          await this.send(p, ticket);
          results.push({ station, printer: p.nome, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Print fail ${p.nome}: ${msg}`);
          results.push({ station, printer: p.nome, ok: false, error: msg });
        }
      }
    }

    const caixaPrinters = printers.filter((p) => p.station === PrinterStation.CAIXA);
    if (caixaPrinters.length) {
      const receipt = buildTicket({
        title: 'RECIBO',
        station: 'CAIXA',
        orderId: order.id,
        lines: items.map((i) => ({ qty: i.qty, name: i.name })),
        total: Number(order.total),
        footer: 'Obrigado!',
      });
      for (const p of caixaPrinters) {
        try {
          await this.send(p, receipt);
          results.push({ station: 'CAIXA', printer: p.nome, ok: true });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Print fail ${p.nome}: ${msg}`);
          results.push({ station: 'CAIXA', printer: p.nome, ok: false, error: msg });
        }
      }
    }

    return { printed: results };
  }

  private send(printer: Printer, data: Buffer): Promise<void> {
    if (printer.protocol === 'mock') {
      this.logger.log(
        `[mock] ${printer.station} ${printer.nome} ${data.length} bytes`,
      );
      return Promise.resolve();
    }

    if (!printer.host?.trim()) {
      return Promise.reject(new BadRequestException('Host da impressora vazio'));
    }

    return new Promise((resolve, reject) => {
      const socket = createConnection(
        { host: printer.host, port: printer.port || 9100 },
        () => {
          socket.write(data, (err) => {
            if (err) {
              socket.destroy();
              reject(err);
              return;
            }
            socket.end();
            resolve();
          });
        },
      );
      socket.setTimeout(5000);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Timeout ${printer.host}:${printer.port}`));
      });
      socket.on('error', reject);
    });
  }
}

export function resolveStation(
  product?: Product | null,
): PrinterStation | 'NENHUMA' {
  const explicit = (product?.printStation || '').toUpperCase();
  if (explicit === 'BAR' || explicit === 'COZINHA' || explicit === 'CAIXA') {
    return explicit as PrinterStation;
  }
  if (explicit === 'NENHUMA') return 'NENHUMA';

  const cat = (product?.categoria || '').toLowerCase();
  if (/bar|bebida|drink|cerveja|coquetel|shot|vinho/.test(cat)) {
    return PrinterStation.BAR;
  }
  if (/cozinha|comida|prato|lanche|food|petisco|porcao|sobremesa/.test(cat)) {
    return PrinterStation.COZINHA;
  }
  // Sem categoria: manda para cozinha (prep genérico)
  return PrinterStation.COZINHA;
}
