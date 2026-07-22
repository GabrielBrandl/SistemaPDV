import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SyncQueue } from '../database/entities';
import { SyncDto } from './dto/sync.dto';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SyncQueue)
    private readonly syncRepo: Repository<SyncQueue>,
  ) {}

  async enqueue(tenantId: string, dto: SyncDto) {
    const items = dto.operacoes.map((op) =>
      this.syncRepo.create({
        tenantId,
        pdvId: dto.pdv_id,
        operacao: op.operacao,
        payload: op.payload,
        tentativas: 0,
      }),
    );
    await this.syncRepo.save(items);
    return { enfileirados: items.length };
  }

  async processPending(tenantId: string, pdvId?: string) {
    const where = pdvId
      ? { tenantId, pdvId, sincronizadoEm: IsNull() }
      : { tenantId, sincronizadoEm: IsNull() };

    const pending = await this.syncRepo.find({
      where,
      order: { criadoEm: 'ASC' },
      take: 50,
    });

    for (const item of pending) {
      item.tentativas += 1;
      item.sincronizadoEm = new Date();
      await this.syncRepo.save(item);
    }

    return { processados: pending.length };
  }

  getPending(tenantId: string, pdvId: string) {
    return this.syncRepo.find({
      where: { tenantId, pdvId, sincronizadoEm: IsNull() },
      order: { criadoEm: 'ASC' },
    });
  }
}
