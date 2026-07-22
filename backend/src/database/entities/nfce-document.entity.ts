import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Tenant } from './tenant.entity';

export enum NfceStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('nfce_documents')
export class NfceDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.nfceDocuments)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'int', nullable: true })
  numero: number | null;

  @Column({ type: 'int', default: 1 })
  serie: number;

  @Column({ name: 'chave_acesso', type: 'varchar', nullable: true })
  chaveAcesso: string | null;

  @Column({ type: 'varchar', nullable: true })
  protocolo: string | null;

  @Column({ name: 'cliente_cpf', type: 'varchar', nullable: true })
  clienteCpf: string | null;

  @Column({ name: 'cliente_nome', type: 'varchar', nullable: true })
  clienteNome: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  valor: number;

  @Column({ type: 'text', nullable: true })
  xml: string | null;

  @Column({ name: 'danfe_url', type: 'varchar', nullable: true })
  danfeUrl: string | null;

  @Column({ type: 'varchar', default: 'homologacao' })
  ambiente: string;

  @Column({ name: 'mensagem_erro', type: 'text', nullable: true })
  mensagemErro: string | null;

  @Column({ type: 'varchar', default: NfceStatus.PENDING })
  status: NfceStatus;

  @CreateDateColumn({ name: 'emitido_em' })
  emitidoEm: Date;
}
