import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { User } from './user.entity';

@Entity('recharges')
export class Recharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id' })
  cardId: string;

  @ManyToOne(() => Card, (card) => card.recharges)
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  valor: number;

  @Column({ name: 'forma_pagamento' })
  formaPagamento: string;

  @Column({ name: 'operador_id', type: 'varchar', nullable: true })
  operadorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operador_id' })
  operador: User | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
