import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  telefone: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  empresa?: string;

  @IsOptional()
  @IsIn(['bar', 'evento', 'rede', 'outro'])
  interesse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mensagem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  origem?: string;
}
