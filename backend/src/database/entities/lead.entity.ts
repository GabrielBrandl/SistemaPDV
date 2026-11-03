import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column()
  email: string;

  @Column({ type: 'varchar', length: 30 })
  telefone: string;

  @Column({ type: 'varchar', nullable: true })
  empresa: string | null;

  /** bar | evento | rede | outro */
  @Column({ type: 'varchar', default: 'bar' })
  interesse: string;

  @Column({ type: 'text', nullable: true })
  mensagem: string | null;

  @Column({ type: 'varchar', default: 'landing' })
  origem: string;

  @Column({ type: 'varchar', default: 'new' })
  status: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
