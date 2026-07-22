import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { Order } from './order.entity';

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'varchar', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Order, (order) => order.transactions, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Column({ name: 'card_id', type: 'varchar', nullable: true })
  cardId: string | null;

  @ManyToOne(() => Card, (card) => card.transactions, { nullable: true })
  @JoinColumn({ name: 'card_id' })
  card: Card | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ type: 'varchar' })
  tipo: TransactionType;

  @Column({ nullable: true, type: 'varchar' })
  gateway: string | null;

  @Column({ type: 'varchar', default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
