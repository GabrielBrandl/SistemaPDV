import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('api_integrations')
export class ApiIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  nome: string;

  @Column({ type: 'varchar' })
  tipo: string;

  @Column({ name: 'api_key', type: 'varchar', unique: true })
  apiKey: string;

  @Column({ name: 'webhook_url', type: 'varchar', nullable: true })
  webhookUrl: string | null;

  @Column({ name: 'webhook_secret', type: 'varchar', nullable: true })
  webhookSecret: string | null;

  @Column({ type: 'simple-json', nullable: true })
  config: Record<string, unknown> | null;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
