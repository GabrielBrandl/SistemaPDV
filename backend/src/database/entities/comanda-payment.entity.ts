import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Comanda } from './comanda.entity';
import { User } from './user.entity';

export enum PaymentMethod {
  DINHEIRO = 'dinheiro',
  PIX = 'pix',
  CREDITO = 'credito',
  DEBITO = 'debito',
  SALDO_PULSEIRA = 'saldo_pulseira',
  CORTESIA = 'cortesia',
  OUTRO = 'outro',
}

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('comanda_payments')
export class ComandaPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comanda_id' })
  comandaId: string;

  @ManyToOne(() => Comanda, (comanda) => comanda.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comanda_id' })
  comanda: Comanda;

  @Column({ type: 'varchar' })
  forma: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ type: 'varchar', default: PaymentStatus.CONFIRMED })
  status: PaymentStatus;

  @Column({ name: 'referencia_externa', type: 'varchar', nullable: true })
  referenciaExterna: string | null;

  @Column({ name: 'gateway', type: 'varchar', nullable: true })
  gateway: string | null;

  @Column({ name: 'operador_id', type: 'varchar', nullable: true })
  operadorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operador_id' })
  operador: User | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
