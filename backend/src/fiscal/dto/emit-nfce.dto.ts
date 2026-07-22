import { IsBoolean, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class EmitNfceDto {
  @IsUUID()
  order_id: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cliente_cpf?: string;

  @IsOptional()
  @IsString()
  cliente_nome?: string;

  @IsOptional()
  @IsBoolean()
  forcar_reemissao?: boolean;
}
