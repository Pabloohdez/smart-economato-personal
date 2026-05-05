import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBajaDto {
  @IsString()
  productoId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsString()
  tipoBaja: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  fechaBaja?: string;
}
