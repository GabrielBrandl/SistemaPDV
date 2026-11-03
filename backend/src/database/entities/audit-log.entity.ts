import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ name: 'actor_user_id', type: 'varchar', nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actor: User | null;

  @Column()
  acao: string;

  @Column({ name: 'entidade_tipo', type: 'varchar', nullable: true })
  entidadeTipo: string | null;

  @Column({ name: 'entidade_id', type: 'varchar', nullable: true })
  entidadeId: string | null;

  @Column({ type: 'text', nullable: true })
  detalhe: string | null;

  @Column({ name: 'antes_json', type: 'text', nullable: true })
  antesJson: string | null;

  @Column({ name: 'depois_json', type: 'text', nullable: true })
  depoisJson: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
