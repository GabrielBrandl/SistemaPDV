import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class ConfirmItemDto {
  @IsString()
  produto_id: string;

  @IsNumber()
  @Min(1)
  qtd: number;

  @IsNumber()
  @Min(0)
  preco_unit: number;
}

export class ConfirmDto {
  @IsUUID()
  reserva_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmItemDto)
  itens: ConfirmItemDto[];

  @IsOptional()
  @IsString()
  pdv_id?: string;
}
