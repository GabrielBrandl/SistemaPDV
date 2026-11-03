import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum UserRole {
  /** @deprecated use PLATFORM_ADMIN */
  SUPER_ADMIN = 'super_admin',
  /** @deprecated use TENANT_ADMIN */
  ADMIN = 'admin',
  /** @deprecated use BARTENDER */
  OPERATOR = 'operator',
  EXIT = 'exit',
  PLATFORM_ADMIN = 'platform_admin',
  TENANT_ADMIN = 'tenant_admin',
  SUPERVISOR = 'supervisor',
  CASHIER = 'cashier',
  BARTENDER = 'bartender',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: UserRole.OPERATOR })
  role: UserRole;

  @Column({ name: 'tenant_id', type: 'varchar', nullable: true })
  tenantId: string | null;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'varchar', nullable: true })
  telefone: string | null;

  /** PIN numérico (hash bcrypt) para autorização no terminal */
  @Column({ name: 'pin_hash', type: 'varchar', nullable: true })
  pinHash: string | null;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
