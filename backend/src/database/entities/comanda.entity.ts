import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Card } from './card.entity';
import { Event } from './event.entity';
import { User } from './user.entity';
import { ComandaItem } from './comanda-item.entity';
import { ComandaPayment } from './comanda-payment.entity';
import { Customer } from './customer.entity';

export enum ComandaStatus {
  OPEN = 'open',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('comandas')
export class Comanda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'card_id' })
  cardId: string;

  @ManyToOne(() => Card)
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ name: 'customer_id', type: 'varchar', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  /** Cópia do session_token do cartão no momento da abertura */
  @Column({ name: 'card_token', type: 'varchar', nullable: true })
  cardToken: string | null;

  @Column({ name: 'event_id', type: 'varchar', nullable: true })
  eventId: string | null;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event | null;

  @Column({ name: 'numero', type: 'int' })
  numero: number;

  @Column({ type: 'varchar', default: ComandaStatus.OPEN })
  status: ComandaStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  desconto: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'total_pago', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPago: number;

  @Column({ name: 'aberta_por', type: 'varchar', nullable: true })
  abertaPor: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'aberta_por' })
  operadorAbertura: User | null;

  @Column({ name: 'fechada_por', type: 'varchar', nullable: true })
  fechadaPor: string | null;

  @Column({ name: 'fechada_em', type: 'timestamptz', nullable: true })
  fechadaEm: Date | null;

  @Column({ name: 'paga_em', type: 'timestamptz', nullable: true })
  pagaEm: Date | null;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @OneToMany(() => ComandaItem, (item) => item.comanda)
  items: ComandaItem[];

  @OneToMany(() => ComandaPayment, (payment) => payment.comanda)
  payments: ComandaPayment[];

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}
