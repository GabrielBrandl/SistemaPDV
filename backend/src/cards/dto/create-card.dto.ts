import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCardDto {
  @IsString()
  uid_nfc: string;

  @IsUUID()
  event_id: string;

  @IsOptional()
  @IsString()
  cliente_nome?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  saldo_inicial?: number;
}
