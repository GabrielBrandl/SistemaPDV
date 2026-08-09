import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Card } from './card.entity';

@Entity('customers')
@Unique(['tenantId', 'cpf'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  nome: string;

  /** CPF somente dígitos (11) */
  @Column({ length: 11 })
  cpf: string;

  @Column({ type: 'varchar', length: 20 })
  telefone: string;

  /** ID no Supabase (quando sincronizado) */
  @Column({ name: 'supabase_id', type: 'varchar', nullable: true })
  supabaseId: string | null;

  @Column({ name: 'ultimo_visita_em', type: 'timestamptz', nullable: true })
  ultimoVisitaEm: Date | null;

  @OneToMany(() => Card, (card) => card.customer)
  cards: Card[];

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}
