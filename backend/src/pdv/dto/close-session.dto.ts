import { IsNumber, IsUUID } from 'class-validator';

export class CloseSessionDto {
  @IsUUID()
  session_id: string;

  @IsNumber()
  total_vendas: number;
}
