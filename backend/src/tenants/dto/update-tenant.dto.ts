import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TenantPlan, TenantStatus } from '../../database/entities/tenant.entity';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  nome?: string;

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
  @IsEnum(TenantStatus)
  status?: TenantStatus;

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
}
