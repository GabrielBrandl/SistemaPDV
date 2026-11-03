import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../database/entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private readonly leadsRepo: Repository<Lead>,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateLeadDto) {
    const lead = await this.leadsRepo.save(
      this.leadsRepo.create({
        nome: dto.nome.trim(),
        email: dto.email.trim().toLowerCase(),
        telefone: dto.telefone.replace(/\D/g, ''),
        empresa: dto.empresa?.trim() || null,
        interesse: dto.interesse || 'bar',
        mensagem: dto.mensagem?.trim() || null,
        origem: dto.origem || 'landing',
        status: 'new',
      }),
    );

    await this.audit.log({
      acao: 'lead.create',
      entidadeTipo: 'lead',
      entidadeId: lead.id,
      depois: {
        email: lead.email,
        interesse: lead.interesse,
        origem: lead.origem,
      },
    });

    return {
      ok: true,
      id: lead.id,
      message: 'Recebemos seu contato. Em breve a equipe fala com você.',
    };
  }

  list(limit = 100) {
    return this.leadsRepo.find({
      order: { criadoEm: 'DESC' },
      take: Math.min(limit, 500),
    });
  }
}
