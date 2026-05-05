import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { LotesService } from './lotes.service';

type CrearLoteBody = {
  productoId: string;
  fechaCaducidad?: string | null;
  cantidad: number;
};

type ConsumirLoteBody = {
  loteId: number;
  cantidad: number;
};

@Controller('lotes')
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @Public()
  @Get()
  async listar() {
    return this.lotesService.listar();
  }

  @Roles('admin')
  @Post()
  async crear(@Body() body: CrearLoteBody) {
    if (!body || !body.productoId) {
      throw new HttpException('Falta productoId', HttpStatus.BAD_REQUEST);
    }
    const cantidad = Number((body as any).cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new HttpException('Cantidad inválida', HttpStatus.BAD_REQUEST);
    }
    const fecha = (body as any).fechaCaducidad ?? null;
    return this.lotesService.crear({
      productoId: String(body.productoId),
      fechaCaducidad: fecha ? String(fecha).slice(0, 10) : null,
      cantidad,
    });
  }

  @Roles('admin')
  @Post('batch')
  async crearBatch(@Body() body: CrearLoteBody[]) {
    if (!Array.isArray(body) || body.length === 0) {
      throw new HttpException('Se requiere un array de lotes', HttpStatus.BAD_REQUEST);
    }
    if (body.length > 500) {
      throw new HttpException('Máximo 500 lotes por lote', HttpStatus.BAD_REQUEST);
    }
    return this.lotesService.crearBatch(
      body.map((l) => {
        if (!l?.productoId) {
          throw new HttpException('Falta productoId', HttpStatus.BAD_REQUEST);
        }
        const cantidad = Number((l as any).cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new HttpException('Cantidad inválida', HttpStatus.BAD_REQUEST);
        }
        const fecha = (l as any).fechaCaducidad ?? null;
        return {
          productoId: String(l.productoId),
          fechaCaducidad: fecha ? String(fecha).slice(0, 10) : null,
          cantidad,
        };
      }),
    );
  }

  @Roles('admin')
  @Post('consumir')
  async consumir(@Body() body: ConsumirLoteBody) {
    const loteId = Number((body as any)?.loteId);
    const cantidad = Number((body as any)?.cantidad);

    if (!Number.isFinite(loteId) || loteId <= 0) {
      throw new HttpException('loteId inválido', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new HttpException('Cantidad inválida', HttpStatus.BAD_REQUEST);
    }

    return this.lotesService.consumir({ loteId, cantidad });
  }
}

