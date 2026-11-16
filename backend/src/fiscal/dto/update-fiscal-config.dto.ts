import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateFiscalConfigDto {
  @IsOptional()
  @IsString()
  focus_nfe_token?: string;

  @IsOptional()
  @IsString()
  @IsIn(['homologacao', 'producao'])
  focus_nfe_ambiente?: string;

  @ValidateIf((_, v) => v !== undefined && v !== null && String(v).trim() !== '')
  @IsString()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve conter 14 dígitos' })
  cnpj?: string;

  @IsOptional()
  @IsString()
  razao_social?: string;

  @IsOptional()
  @IsString()
  empresa_uf_codigo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  nfce_serie?: number;
}
