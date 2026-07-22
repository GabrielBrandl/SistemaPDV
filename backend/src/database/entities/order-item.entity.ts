import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'produto_id' })
  produtoId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'produto_id' })
  produto: Product;

  @Column({ type: 'int' })
  qtd: number;

  @Column({ name: 'preco_unit', type: 'decimal', precision: 12, scale: 2 })
  precoUnit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;
}
