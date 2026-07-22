import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ApiIntegration } from '../database/entities';
import { CreateIntegrationDto } from './dto/create-integration.dto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(ApiIntegration)
    private readonly integrationsRepo: Repository<ApiIntegration>,
  ) {}

  list(tenantId: string) {
    return this.integrationsRepo.find({
      where: { tenantId },
      order: { criadoEm: 'DESC' },
    });
  }

  async create(tenantId: string, dto: CreateIntegrationDto) {
    const apiKey = `pdv_${randomBytes(24).toString('hex')}`;
    const integration = this.integrationsRepo.create({
      tenantId,
      nome: dto.nome,
      tipo: dto.tipo,
      apiKey,
      webhookUrl: dto.webhook_url ?? null,
      webhookSecret: dto.webhook_secret ?? randomBytes(16).toString('hex'),
      config: dto.config ?? null,
      ativo: true,
    });
    return this.integrationsRepo.save(integration);
  }

  async findByApiKey(apiKey: string) {
    return this.integrationsRepo.findOne({ where: { apiKey, ativo: true } });
  }

  async emitEvent(tenantId: string, event: string, payload: Record<string, unknown>) {
    const integrations = await this.integrationsRepo.find({
      where: { tenantId, ativo: true },
    });

    for (const integration of integrations) {
      if (!integration.webhookUrl) continue;
      const body = {
        event,
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        data: payload,
      };
      const signature = createHash('sha256')
        .update(`${integration.webhookSecret || ''}.${JSON.stringify(body)}`)
        .digest('hex');

      try {
        await fetch(integration.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-PDV-Event': event,
            'X-PDV-Signature': signature,
            'X-PDV-Integration': integration.id,
          },
          body: JSON.stringify(body),
        });
      } catch (error) {
        this.logger.warn(
          `Webhook falhou (${integration.nome}): ${
            error instanceof Error ? error.message : 'erro'
          }`,
        );
      }
    }
  }

  async deactivate(tenantId: string, id: string) {
    const integration = await this.integrationsRepo.findOne({
      where: { id, tenantId },
    });
    if (!integration) return null;
    integration.ativo = false;
    return this.integrationsRepo.save(integration);
  }
}
