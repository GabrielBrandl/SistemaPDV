import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Event } from './event.entity';
import { Tenant } from './tenant.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.products)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column()
  nome: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  preco: number;

  @Column({ nullable: true, type: 'varchar' })
  categoria: string | null;

  @Column({ default: true })
  ativo: boolean;
}
