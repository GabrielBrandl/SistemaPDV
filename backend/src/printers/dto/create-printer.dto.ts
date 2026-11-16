import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PrinterStation } from '../../database/entities/printer.entity';

export class CreatePrinterDto {
  @IsString()
  nome: string;

  @IsEnum(PrinterStation)
  station: PrinterStation;

  @IsString()
  host: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  protocol?: string;
}
