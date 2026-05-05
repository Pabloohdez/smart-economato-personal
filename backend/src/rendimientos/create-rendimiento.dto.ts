import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRendimientoDto {
  @IsOptional()
  @IsString()
  ingrediente?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pesoBruto?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pesoNeto?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  desperdicio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rendimiento?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  merma?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  fecha?: string;
}
