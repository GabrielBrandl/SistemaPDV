import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('sync_queue')
export class SyncQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'pdv_id' })
  pdvId: string;

  @Column()
  operacao: string;

  @Column({ type: 'simple-json' })
  payload: Record<string, unknown>;

  @Column({ default: 0 })
  tentativas: number;

  @Column({ name: 'sincronizado_em', type: 'datetime', nullable: true })
  sincronizadoEm: Date | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
