import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMovimientoDto {
  @IsString()
  productoId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsOptional()
  @IsIn(['ENTRADA', 'SALIDA'])
  tipo?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
