import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Session } from './session.entity';
import { Tenant } from './tenant.entity';

export enum PdvTerminalStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
}

@Entity('pdv_terminals')
@Unique(['tenantId', 'serial'])
export class PdvTerminal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  serial: string;

  @Column({ nullable: true, type: 'varchar' })
  adquirente: string | null;

  @Column({ nullable: true, type: 'varchar' })
  modelo: string | null;

  @Column({ type: 'varchar', default: PdvTerminalStatus.OFFLINE })
  status: PdvTerminalStatus;

  @Column({ name: 'ultimo_sync', type: 'timestamptz', nullable: true })
  ultimoSync: Date | null;

  @OneToMany(() => Session, (session) => session.pdv)
  sessions: Session[];
}
