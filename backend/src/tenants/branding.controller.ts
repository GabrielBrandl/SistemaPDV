import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { Tenant } from '../database/entities';

@Controller('branding')
@UseGuards(JwtAuthGuard)
export class BrandingController {
  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  @Get()
  async get(@TenantId() tenantId: string) {
    const t = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    return {
      nome: t?.nomeExibicao || t?.nome || 'PDV Cashless',
      logo_url: t?.logoUrl ?? null,
      cor_primaria: t?.corPrimaria || '#f59e0b',
      plano: t?.plano,
    };
  }
}
