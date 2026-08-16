import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { TenantPlan } from '../../database/entities/tenant.entity';

export class ProvisionCompanyDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  razao_social?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsEnum(TenantPlan)
  plano?: TenantPlan;

  @IsOptional()
  @IsString()
  email_contato?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  notas_internas?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  trial_dias?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_terminais?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_eventos?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_usuarios?: number;

  @IsOptional()
  @IsString()
  ciclo_cobranca?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_mensal?: number;

  @IsString()
  admin_name: string;

  @IsEmail()
  admin_email: string;

  @IsString()
  @MinLength(6)
  admin_password: string;
}
