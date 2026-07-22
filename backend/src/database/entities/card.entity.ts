import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Event } from './event.entity';
import { Recharge } from './recharge.entity';
import { SaldoReserve } from './saldo-reserve.entity';
import { Transaction } from './transaction.entity';
import { Tenant } from './tenant.entity';
import { Customer } from './customer.entity';

export enum CardStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  INACTIVE = 'inactive',
  EXITED = 'exited',
}

@Entity('cards')
@Unique(['tenantId', 'uidNfc'])
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'uid_nfc' })
  uidNfc: string;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.cards)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'cliente_nome', type: 'varchar', nullable: true })
  clienteNome: string | null;

  @Column({ name: 'customer_id', type: 'varchar', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, (customer) => customer.cards, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  /**
   * Token da visita atual — autentica pedidos neste cartão até a saída.
   * Regenerado no cadastro/check-in.
   */
  @Column({ name: 'session_token', type: 'varchar', nullable: true })
  sessionToken: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  saldo: number;

  @Column({ type: 'varchar', default: CardStatus.ACTIVE })
  status: CardStatus;

  @OneToMany(() => Recharge, (recharge) => recharge.card)
  recharges: Recharge[];

  @OneToMany(() => SaldoReserve, (reserve) => reserve.card)
  reserves: SaldoReserve[];

  @OneToMany(() => Transaction, (transaction) => transaction.card)
  transactions: Transaction[];
}
