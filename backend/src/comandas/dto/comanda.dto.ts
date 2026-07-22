import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../database/entities/comanda-payment.entity';

export class AddComandaItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ComandaItemInput)
  itens: ComandaItemInput[];
}

class ComandaItemInput {
  @IsUUID()
  produto_id: string;

  @IsNumber()
  @Min(1)
  qtd: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class NfcTapDto {
  @IsString()
  uid_nfc: string;

  @IsOptional()
  @IsUUID()
  event_id?: string;

  @IsOptional()
  @IsString()
  pdv_id?: string;
}

export class CloseComandaDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  desconto?: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class PayComandaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentInput)
  pagamentos: PaymentInput[];

  @IsOptional()
  @IsBoolean()
  emitir_nota?: boolean;

  @IsOptional()
  @IsString()
  cliente_cpf?: string;
}

class PaymentInput {
  @IsEnum(PaymentMethod)
  forma: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsOptional()
  @IsString()
  referencia_externa?: string;

  @IsOptional()
  @IsString()
  gateway?: string;
}
