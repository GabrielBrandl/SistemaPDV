import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Comanda } from './comanda.entity';
import { PaymentMethod } from './comanda-payment.entity';

export enum PaymentIntentChannel {
  PIX = 'pix',
  CARD_CONTACTLESS = 'card_contactless',
}

export enum PaymentIntentStatus {
  PENDING = 'pending',
  AWAITING_CUSTOMER = 'awaiting_customer',
  APPROVED = 'approved',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('payment_intents')
export class PaymentIntent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'comanda_id' })
  comandaId: string;

  @ManyToOne(() => Comanda)
  @JoinColumn({ name: 'comanda_id' })
  comanda: Comanda;

  @Column({ type: 'varchar' })
  channel: PaymentIntentChannel;

  /** pix | debito | credito */
  @Column({ type: 'varchar' })
  forma: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ type: 'varchar', default: PaymentIntentStatus.PENDING })
  status: PaymentIntentStatus;

  @Column({ name: 'provider', type: 'varchar', default: 'demo' })
  provider: string;

  @Column({ name: 'provider_ref', type: 'varchar', nullable: true })
  providerRef: string | null;

  /** PIX copia-e-cola / payload EMV */
  @Column({ name: 'pix_copia_cola', type: 'text', nullable: true })
  pixCopiaCola: string | null;

  @Column({ name: 'qr_payload', type: 'text', nullable: true })
  qrPayload: string | null;

  @Column({ name: 'softpos_instruction', type: 'text', nullable: true })
  softposInstruction: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'operador_id', type: 'varchar', nullable: true })
  operadorId: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}
