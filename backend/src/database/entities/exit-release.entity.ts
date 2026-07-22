import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Card } from './card.entity';
import { User } from './user.entity';

export enum ExitStatus {
  BLOCKED = 'blocked',
  RELEASED = 'released',
  FORCED = 'forced',
}

@Entity('exit_releases')
export class ExitRelease {
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

  @Column({ name: 'card_uid' })
  cardUid: string;

  @Column({ name: 'cliente_nome', type: 'varchar', nullable: true })
  clienteNome: string | null;

  @Column({ type: 'varchar', default: ExitStatus.RELEASED })
  status: ExitStatus;

  @Column({ name: 'total_consumido', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalConsumido: number;

  @Column({ name: 'comandas_pagas', type: 'int', default: 0 })
  comandasPagas: number;

  @Column({ name: 'pendencia', type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendencia: number;

  @Column({ name: 'operador_id', type: 'varchar', nullable: true })
  operadorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operador_id' })
  operador: User | null;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @CreateDateColumn({ name: 'liberado_em' })
  liberadoEm: Date;
}
