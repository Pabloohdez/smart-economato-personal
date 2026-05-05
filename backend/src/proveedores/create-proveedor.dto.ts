import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsEmail } from 'class-validator';

function normalizeOptionalEmail(value: unknown) {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
}

export class CreateProveedorDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalEmail(value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}

export class UpdateProveedorDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalEmail(value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}
