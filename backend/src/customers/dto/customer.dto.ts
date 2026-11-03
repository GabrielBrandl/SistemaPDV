import {
  IsBoolean,
  IsDateString,
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

  @IsOptional()
  @IsDateString()
  data_nascimento?: string;

  @IsOptional()
  @IsBoolean()
  lgpd_consent?: boolean;
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
