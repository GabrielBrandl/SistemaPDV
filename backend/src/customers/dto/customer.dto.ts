import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class LookupCpfDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' })
  cpf: string;
}

export class RegisterCustomerDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' })
  cpf: string;

  @IsString()
  @MinLength(8)
  telefone: string;

  @IsString()
  uid_nfc: string;

  @IsOptional()
  @IsUUID()
  event_id?: string;
}

export class CheckinCustomerDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos' })
  cpf: string;

  @IsString()
  uid_nfc: string;

  @IsOptional()
  @IsUUID()
  event_id?: string;
}
