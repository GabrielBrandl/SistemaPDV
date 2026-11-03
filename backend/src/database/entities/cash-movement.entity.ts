import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CashSession } from './cash-session.entity';
import { User } from './user.entity';

export enum CashMovementType {
  OPENING = 'opening',
  SALE = 'sale',
  RECHARGE = 'recharge',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  ADJUSTMENT = 'adjustment',
  CLOSING = 'closing',
}

@Entity('cash_movements')
export class CashMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cash_session_id' })
  cashSessionId: string;

  @ManyToOne(() => CashSession, (s) => s.movements)
  @JoinColumn({ name: 'cash_session_id' })
  cashSession: CashSession;

  @Column({ type: 'varchar' })
  tipo: CashMovementType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ type: 'varchar', nullable: true })
  forma: string | null;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @Column({ name: 'referencia_tipo', type: 'varchar', nullable: true })
  referenciaTipo: string | null;

  @Column({ name: 'referencia_id', type: 'varchar', nullable: true })
  referenciaId: string | null;

  @Column({ name: 'operador_id', type: 'varchar', nullable: true })
  operadorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operador_id' })
  operador: User | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
