import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { TenantPlan } from '../../database/entities/tenant.entity';

export class OnboardTenantDto {
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
  telefone?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsString()
  admin_name: string;

  @IsEmail()
  admin_email: string;

  @IsString()
  @MinLength(6)
  admin_password: string;
}

export class CreateTenantDto {
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
  focus_nfe_token?: string;

  @IsOptional()
  @IsString()
  focus_nfe_ambiente?: string;

  @IsOptional()
  @IsString()
  empresa_uf_codigo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nfce_serie?: number;

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
}
