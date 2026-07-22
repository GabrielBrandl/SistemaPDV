import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../../database/entities';

export class CreatePixPaymentDto {
  @IsUUID()
  comanda_id: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valor?: number;
}

export class CreateCardPaymentDto {
  @IsUUID()
  comanda_id: string;

  @IsEnum(PaymentMethod)
  forma: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valor?: number;
}

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  provider_ref?: string;

  @IsOptional()
  @IsString()
  softpos_transaction_id?: string;
}
