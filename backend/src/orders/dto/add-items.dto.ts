import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

class OrderItemInput {
  @IsString()
  produto_id: string;

  @IsNumber()
  @Min(1)
  qtd: number;
}

export class AddItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  itens: OrderItemInput[];
}
