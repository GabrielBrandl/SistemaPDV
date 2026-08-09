import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Card } from './card.entity';

export enum ReserveStatus {
  ACTIVE = 'active',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  ROLLED_BACK = 'rolled_back',
}

@Entity('saldo_reserves')
export class SaldoReserve {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id' })
  cardId: string;

  @ManyToOne(() => Card, (card) => card.reserves)
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ name: 'transacao_id' })
  transacaoId: string;

  @Column({ name: 'pdv_id', type: 'varchar', nullable: true })
  pdvId: string | null;

  @Column({ name: 'expira_em', type: 'timestamptz' })
  expiraEm: Date;

  @Column({ type: 'varchar', default: ReserveStatus.ACTIVE })
  status: ReserveStatus;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
