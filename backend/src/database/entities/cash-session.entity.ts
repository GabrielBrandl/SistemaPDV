import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Event } from './event.entity';
import { User } from './user.entity';
import { PdvTerminal } from './pdv-terminal.entity';
import type { CashMovement } from './cash-movement.entity';

export enum CashSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('cash_sessions')
export class CashSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'pdv_id', type: 'varchar', nullable: true })
  pdvId: string | null;

  @ManyToOne(() => PdvTerminal, { nullable: true })
  @JoinColumn({ name: 'pdv_id' })
  pdv: PdvTerminal | null;

  @Column({ name: 'operador_id' })
  operadorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operador_id' })
  operador: User;

  @Column({ type: 'varchar', default: CashSessionStatus.OPEN })
  status: CashSessionStatus;

  @Column({ name: 'fundo_inicial', type: 'decimal', precision: 12, scale: 2, default: 0 })
  fundoInicial: number;

  @Column({ name: 'total_entradas', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEntradas: number;

  @Column({ name: 'total_saidas', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSaidas: number;

  @Column({ name: 'contado_fechamento', type: 'decimal', precision: 12, scale: 2, nullable: true })
  contadoFechamento: number | null;

  @Column({ name: 'diferenca', type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferenca: number | null;

  @Column({ type: 'timestamptz' })
  abertura: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fechamento: Date | null;

  @OneToMany('CashMovement', 'cashSession')
  movements: CashMovement[];

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
