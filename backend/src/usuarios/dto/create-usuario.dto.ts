import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

function normalizeOptionalEmail(value: unknown) {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
}

function normalizeOptionalPhone(value: unknown) {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized || undefined;
}

export class CreateUsuarioDto {
  @IsString()
  @MinLength(3)
  usuario!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @Transform(({ value }) => normalizeOptionalEmail(value))
  @IsEmail()
  email!: string;

  @Transform(({ value }) => normalizeOptionalPhone(value))
  @IsOptional()
  @Matches(/^[+\d()\s-]{7,20}$/)
  telefono?: string;

  @IsOptional()
  @IsIn(['admin', 'usuario'])
  rol?: string;
}