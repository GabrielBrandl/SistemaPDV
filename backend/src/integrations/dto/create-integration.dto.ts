import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateIntegrationDto {
  @IsString()
  nome: string;

  @IsString()
  tipo: string;

  @IsOptional()
  @IsString()
  webhook_url?: string;

  @IsOptional()
  @IsString()
  webhook_secret?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
