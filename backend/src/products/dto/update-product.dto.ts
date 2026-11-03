import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  preco?: number;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsBoolean()
  controla_estoque?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoque_atual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoque_minimo?: number;

  @IsOptional()
  @IsBoolean()
  somente_adultos?: boolean;
}
