import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('subscription_invoices')
export class SubscriptionInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ type: 'varchar', default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Column({ type: 'varchar', default: 'monthly' })
  ciclo: string;

  @Column({ type: 'varchar', nullable: true })
  descricao: string | null;

  @Column({ name: 'periodo_inicio', type: 'timestamptz' })
  periodoInicio: Date;

  @Column({ name: 'periodo_fim', type: 'timestamptz' })
  periodoFim: Date;

  @Column({ name: 'pago_em', type: 'timestamptz', nullable: true })
  pagoEm: Date | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
