import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RefundDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valor?: number;

  @IsOptional()
  @IsString()
  forma_devolucao?: string;
}
