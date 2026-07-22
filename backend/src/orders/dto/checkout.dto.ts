import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CheckoutDto {
  @IsString()
  card_uid: string;

  @IsOptional()
  @IsString()
  pdv_id?: string;

  @IsOptional()
  @IsBoolean()
  emitir_nota?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos' })
  cliente_cpf?: string;

  @IsOptional()
  @IsString()
  cliente_nome?: string;
}
