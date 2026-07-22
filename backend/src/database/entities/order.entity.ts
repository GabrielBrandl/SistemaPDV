import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { Session } from './session.entity';
import { OrderItem } from './order-item.entity';
import { Transaction } from './transaction.entity';
import { NfceDocument } from './nfce-document.entity';
import { Tenant } from './tenant.entity';

export enum OrderStatus {
  OPEN = 'open',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'session_id', type: 'varchar', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => Session, (session) => session.orders, { nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: Session | null;

  @Column({ name: 'card_id', type: 'varchar', nullable: true })
  cardId: string | null;

  @ManyToOne(() => Card, { nullable: true })
  @JoinColumn({ name: 'card_id' })
  card: Card | null;

  @Column({ type: 'varchar', default: OrderStatus.OPEN })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'transacao_id', type: 'varchar', nullable: true })
  transacaoId: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => Transaction, (transaction) => transaction.order)
  transactions: Transaction[];

  @OneToMany(() => NfceDocument, (doc) => doc.order)
  nfceDocuments: NfceDocument[];
}
