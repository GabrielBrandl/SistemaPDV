import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TenantPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'razao_social', type: 'varchar', nullable: true })
  razaoSocial: string | null;

  @Column({ type: 'varchar', nullable: true })
  cnpj: string | null;

  @Column({ type: 'varchar', default: TenantPlan.STARTER })
  plano: TenantPlan;

  @Column({ type: 'varchar', default: TenantStatus.TRIAL })
  status: TenantStatus;

  @Column({ name: 'focus_nfe_token', type: 'varchar', nullable: true })
  focusNfeToken: string | null;

  @Column({ name: 'focus_nfe_ambiente', type: 'varchar', default: 'homologacao' })
  focusNfeAmbiente: string;

  @Column({ name: 'empresa_uf_codigo', type: 'varchar', default: '13' })
  empresaUfCodigo: string;

  @Column({ name: 'nfce_serie', type: 'int', default: 1 })
  nfceSerie: number;

  @Column({ name: 'max_terminais', type: 'int', default: 3 })
  maxTerminais: number;

  @Column({ name: 'max_eventos', type: 'int', default: 5 })
  maxEventos: number;

  @Column({ name: 'trial_ate', type: 'datetime', nullable: true })
  trialAte: Date | null;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
