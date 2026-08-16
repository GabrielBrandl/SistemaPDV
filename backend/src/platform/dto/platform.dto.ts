import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TenantPlan, TenantStatus } from '../../database/entities';

export class ChangePlanDto {
  @IsEnum(TenantPlan)
  plano: TenantPlan;
}

export class ChangeStatusDto {
  @IsEnum(TenantStatus)
  status: TenantStatus;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  razao_social?: string | null;

  @IsOptional()
  @IsString()
  cnpj?: string | null;

  @IsOptional()
  @IsString()
  email_contato?: string | null;

  @IsOptional()
  @IsString()
  telefone?: string | null;

  @IsOptional()
  @IsString()
  cidade?: string | null;

  @IsOptional()
  @IsString()
  uf?: string | null;

  @IsOptional()
  @IsString()
  notas_internas?: string | null;

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
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor?: number;

  @IsOptional()
  @IsString()
  descricao?: string;
}
