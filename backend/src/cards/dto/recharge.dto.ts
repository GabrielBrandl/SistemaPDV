import { IsNumber, IsString, Min } from 'class-validator';

export class RechargeDto {
  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsString()
  forma_pagamento: string;
}
