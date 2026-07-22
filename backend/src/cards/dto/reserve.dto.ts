import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReserveDto {
  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsString()
  transacao_id: string;

  @IsOptional()
  @IsString()
  pdv_id?: string;
}
