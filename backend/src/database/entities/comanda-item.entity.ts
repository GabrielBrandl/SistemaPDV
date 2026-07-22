import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Comanda } from './comanda.entity';
import { Product } from './product.entity';

@Entity('comanda_items')
export class ComandaItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comanda_id' })
  comandaId: string;

  @ManyToOne(() => Comanda, (comanda) => comanda.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comanda_id' })
  comanda: Comanda;

  @Column({ name: 'produto_id' })
  produtoId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'produto_id' })
  produto: Product;

  @Column()
  nome: string;

  @Column({ type: 'int' })
  qtd: number;

  @Column({ name: 'preco_unit', type: 'decimal', precision: 12, scale: 2 })
  precoUnit: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
