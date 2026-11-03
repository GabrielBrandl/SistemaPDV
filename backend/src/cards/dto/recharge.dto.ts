import { IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf } from 'class-validator';

export class RechargeDto {
  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsString()
  forma_pagamento: string;

  /** Obrigatório salvo dinheiro com caixa aberto (criado internamente) ou demo confirmado */
  @ValidateIf((o: RechargeDto) => o.forma_pagamento !== 'dinheiro')
  @IsUUID()
  payment_intent_id?: string;

  @IsOptional()
  @IsUUID()
  event_id?: string;

  @IsOptional()
  @IsString()
  pdv_id?: string;
}

export class CreateRechargeIntentDto {
  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsString()
  forma_pagamento: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
