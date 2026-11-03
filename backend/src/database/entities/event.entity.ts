import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { Product } from './product.entity';
import { Tenant } from './tenant.entity';

export enum EventStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum EventMode {
  PREPAID = 'prepaid',
  POSTPAID = 'postpaid',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  nome: string;

  @Column({ name: 'data_inicio', type: 'timestamptz' })
  dataInicio: Date;

  @Column({ name: 'data_fim', type: 'timestamptz' })
  dataFim: Date;

  @Column({ type: 'varchar', default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ type: 'varchar', default: EventMode.PREPAID })
  modo: EventMode;

  @Column({ name: 'somente_adultos', type: 'boolean', default: false })
  somenteAdultos: boolean;

  @Column({ name: 'exige_caixa_aberto', type: 'boolean', default: true })
  exigeCaixaAberto: boolean;

  @Column({ name: 'limite_credito_postpaid', type: 'decimal', precision: 12, scale: 2, nullable: true })
  limiteCreditoPostpaid: number | null;

  @OneToMany(() => Card, (card) => card.event)
  cards: Card[];

  @OneToMany(() => Product, (product) => product.event)
  products: Product[];
}
