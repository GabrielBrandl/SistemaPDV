import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';

export type AuditEntry = {
  tenantId?: string | null;
  actorUserId?: string | null;
  acao: string;
  entidadeTipo?: string | null;
  entidadeId?: string | null;
  detalhe?: string | null;
  antes?: Record<string, unknown> | null;
  depois?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(entry: AuditEntry) {
    const row = this.auditRepo.create({
      tenantId: entry.tenantId ?? null,
      actorUserId: entry.actorUserId ?? null,
      acao: entry.acao,
      entidadeTipo: entry.entidadeTipo ?? null,
      entidadeId: entry.entidadeId ?? null,
      detalhe: entry.detalhe ?? null,
      antesJson: entry.antes ? JSON.stringify(entry.antes) : null,
      depoisJson: entry.depois ? JSON.stringify(entry.depois) : null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
    return this.auditRepo.save(row);
  }

  async list(tenantId: string | null, limit = 100) {
    const where = tenantId ? { tenantId } : {};
    return this.auditRepo.find({
      where,
      order: { criadoEm: 'DESC' },
      take: Math.min(limit, 500),
      relations: { actor: true },
    });
  }
}
