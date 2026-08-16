import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  PdvTerminal,
  PdvTerminalStatus,
  Session,
  Tenant,
} from '../database/entities';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';

@Injectable()
export class PdvService {
  constructor(
    @InjectRepository(PdvTerminal)
    private readonly terminalsRepo: Repository<PdvTerminal>,
    @InjectRepository(Session)
    private readonly sessionsRepo: Repository<Session>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  async getOrCreateTerminal(tenantId: string, serial: string) {
    let terminal = await this.terminalsRepo.findOne({
      where: { tenantId, serial },
    });
    if (!terminal) {
      const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
      if (!tenant) throw new NotFoundException('Tenant não encontrado');
      const count = await this.terminalsRepo.count({ where: { tenantId } });
      if (count >= tenant.maxTerminais) {
        throw new BadRequestException(
          `Limite de terminais do plano (${tenant.maxTerminais}) atingido`,
        );
      }
      terminal = this.terminalsRepo.create({
        tenantId,
        serial,
        status: PdvTerminalStatus.OFFLINE,
      });
      terminal = await this.terminalsRepo.save(terminal);
    }
    return terminal;
  }

  async openSession(tenantId: string, dto: OpenSessionDto) {
    const terminal = await this.getOrCreateTerminal(tenantId, dto.pdv_serial);
    const openSession = await this.sessionsRepo.findOne({
      where: { pdvId: terminal.id, fechamento: IsNull() },
    });
    if (openSession) {
      throw new BadRequestException('Sessão já aberta neste PDV');
    }

    terminal.status = PdvTerminalStatus.ONLINE;
    terminal.ultimoSync = new Date();
    await this.terminalsRepo.save(terminal);

    const session = this.sessionsRepo.create({
      pdvId: terminal.id,
      operadorId: dto.operador_id,
      abertura: new Date(),
      totalVendas: 0,
    });
    return this.sessionsRepo.save(session);
  }

  async closeSession(tenantId: string, dto: CloseSessionDto) {
    const session = await this.sessionsRepo.findOne({
      where: { id: dto.session_id },
      relations: { pdv: true },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.pdv?.tenantId !== tenantId) {
      throw new NotFoundException('Sessão não encontrada');
    }
    if (session.fechamento) {
      throw new BadRequestException('Sessão já fechada');
    }

    session.fechamento = new Date();
    session.totalVendas = dto.total_vendas;
    await this.sessionsRepo.save(session);

    if (session.pdv) {
      session.pdv.status = PdvTerminalStatus.OFFLINE;
      await this.terminalsRepo.save(session.pdv);
    }

    return session;
  }

  async getTerminalStatus(tenantId: string, id: string) {
    const terminal = await this.terminalsRepo.findOne({
      where: { id, tenantId },
      relations: { sessions: true },
    });
    if (!terminal) throw new NotFoundException('Terminal não encontrado');

    const activeSession = await this.sessionsRepo.findOne({
      where: { pdvId: id, fechamento: IsNull() },
      relations: { operador: true },
    });

    return {
      id: terminal.id,
      serial: terminal.serial,
      status: terminal.status,
      ultimo_sync: terminal.ultimoSync,
      sessao_ativa: activeSession,
    };
  }

  listTerminals(tenantId: string) {
    return this.terminalsRepo.find({
      where: { tenantId },
      order: { serial: 'ASC' },
    });
  }
}
