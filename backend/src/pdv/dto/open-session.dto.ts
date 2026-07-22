import { IsNumber, IsString, IsUUID } from 'class-validator';

export class OpenSessionDto {
  @IsString()
  pdv_serial: string;

  @IsUUID()
  operador_id: string;
}
