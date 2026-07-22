import { Type } from 'class-transformer';
import { IsArray, IsObject, IsString, ValidateNested } from 'class-validator';

class SyncOperationDto {
  @IsString()
  operacao: string;

  @IsObject()
  payload: Record<string, unknown>;
}

export class SyncDto {
  @IsString()
  pdv_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operacoes: SyncOperationDto[];
}
