import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EventMode, EventStatus } from '../../database/entities/event.entity';

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

  @IsOptional()
  @IsEnum(EventMode)
  modo?: EventMode;

  @IsOptional()
  @IsBoolean()
  somente_adultos?: boolean;

  @IsOptional()
  @IsBoolean()
  exige_caixa_aberto?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limite_credito_postpaid?: number;
}
