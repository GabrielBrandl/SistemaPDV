import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PdvTerminal } from './pdv-terminal.entity';
import { User } from './user.entity';
import { Order } from './order.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pdv_id' })
  pdvId: string;

  @ManyToOne(() => PdvTerminal, (pdv) => pdv.sessions)
  @JoinColumn({ name: 'pdv_id' })
  pdv: PdvTerminal;

  @Column({ name: 'operador_id' })
  operadorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operador_id' })
  operador: User;

  @Column({ type: 'datetime' })
  abertura: Date;

  @Column({ type: 'datetime', nullable: true })
  fechamento: Date | null;

  @Column({ name: 'total_vendas', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalVendas: number;

  @OneToMany(() => Order, (order) => order.session)
  orders: Order[];
}
