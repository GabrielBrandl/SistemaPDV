import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EventStatus } from '../../database/entities/event.entity';

export class CreateEventDto {
  @IsString()
  nome: string;

  @IsDateString()
  data_inicio: string;

  @IsDateString()
  data_fim: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
