import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum PrinterStation {
  BAR = 'BAR',
  COZINHA = 'COZINHA',
  CAIXA = 'CAIXA',
}

@Entity('printers')
export class Printer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  nome: string;

  @Column({ type: 'varchar', length: 16 })
  station: PrinterStation;

  @Column()
  host: string;

  @Column({ type: 'int', default: 9100 })
  port: number;

  @Column({ default: true })
  ativo: boolean;

  /** escpos_tcp | mock (log only) */
  @Column({ type: 'varchar', length: 32, default: 'escpos_tcp' })
  protocol: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}
