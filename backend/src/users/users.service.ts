import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Tenant, User, UserRole } from '../database/entities';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  async listForTenant(tenantId: string) {
    return this.usersRepo.find({
      where: { tenantId },
      order: { criadoEm: 'DESC' },
      select: ['id', 'email', 'name', 'role', 'ativo', 'telefone', 'criadoEm'],
    });
  }

  async create(tenantId: string, dto: CreateUserDto) {
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Não é possível criar super_admin aqui');
    }
    const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const activeCount = await this.usersRepo.count({
      where: { tenantId, ativo: true },
    });
    if (activeCount >= tenant.maxUsuarios) {
      throw new BadRequestException(
        `Limite de usuários do plano atingido (${tenant.maxUsuarios})`,
      );
    }

    const exists = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email: dto.email,
        password,
        name: dto.name,
        role: dto.role,
        tenantId,
        telefone: dto.telefone ?? null,
        ativo: true,
      }),
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ativo: user.ativo,
      telefone: user.telefone,
      criadoEm: user.criadoEm,
    };
  }

  async update(tenantId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.usersRepo.findOne({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Usuário protegido');
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.telefone !== undefined) user.telefone = dto.telefone;
    if (dto.role !== undefined) {
      if (dto.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Role inválida');
      }
      user.role = dto.role;
    }
    if (dto.ativo !== undefined) {
      if (dto.ativo === true && !user.ativo) {
        const tenant = await this.tenantsRepo.findOne({
          where: { id: tenantId },
        });
        const activeCount = await this.usersRepo.count({
          where: { tenantId, ativo: true },
        });
        if (tenant && activeCount >= tenant.maxUsuarios) {
          throw new BadRequestException('Limite de usuários atingido');
        }
      }
      user.ativo = dto.ativo;
    }
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.usersRepo.save(user);
    return {
      id: saved.id,
      email: saved.email,
      name: saved.name,
      role: saved.role,
      ativo: saved.ativo,
      telefone: saved.telefone,
      criadoEm: saved.criadoEm,
    };
  }
}
