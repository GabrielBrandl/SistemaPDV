import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  event_id: string;

  @IsString()
  nome: string;

  @IsNumber()
  @Min(0)
  preco: number;

  @IsOptional()
  @IsString()
  categoria?: string;

  /** BAR | COZINHA | CAIXA | NENHUMA — null = auto pela categoria */
  @IsOptional()
  @IsString()
  print_station?: string;

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
