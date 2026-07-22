import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class OnboardTenantDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  razao_social?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsString()
  admin_name: string;

  @IsEmail()
  admin_email: string;

  @IsString()
  @MinLength(6)
  admin_password: string;
}
