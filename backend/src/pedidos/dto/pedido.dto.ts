import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const UNIDADES_PEDIDO = ['ud', 'kg', 'l', 'g', 'ml'] as const;

export class PedidoItemDto {
  @IsString()
  producto_id: string;

  @IsOptional()
  @IsString()
  @IsIn(UNIDADES_PEDIDO)
  unidad?: (typeof UNIDADES_PEDIDO)[number];

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;
}

export class CreatePedidoDto {
  @Type(() => Number)
  @IsNumber()
  proveedorId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PedidoItemDto)
  items?: PedidoItemDto[];
}

export class RecepcionItemDto {
  @Type(() => Number)
  @IsNumber()
  detalle_id: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad_recibida: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecepcionLoteDto)
  lotes?: RecepcionLoteDto[];
}

export class RecepcionLoteDto {
  @IsOptional()
  @IsString()
  fecha_caducidad?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class UpdatePedidoDto {
  @IsOptional()
  @IsString()
  accion?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecepcionItemDto)
  items?: RecepcionItemDto[];
}
