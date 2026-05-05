import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class SaveEscandalloItemDto {
  @IsString()
  producto_id: string;

  @IsString()
  nombre: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;
}

export class SaveEscandalloDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  autor?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pvp: number;

  @IsOptional()
  @IsString()
  elaboracion?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveEscandalloItemDto)
  items: SaveEscandalloItemDto[];
}