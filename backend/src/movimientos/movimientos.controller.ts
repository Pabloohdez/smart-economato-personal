import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('movimientos')
export class MovimientosController {
  constructor(
    private readonly movimientosService: MovimientosService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get()
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const l = limit ? parseInt(limit, 10) : undefined;
    return this.movimientosService.findAll(p, l);
  }

  @Post()
  async crear(@Body() body: CreateMovimientoDto, @Req() req: AuthenticatedRequest) {
    const ip = req.socket?.remoteAddress;
    const result = await this.movimientosService.crear(
      {
        productoId: body.productoId,
        cantidad: body.cantidad,
        tipo: body.tipo ?? 'ENTRADA',
        motivo: body.motivo,
        usuarioId: req.user?.sub,
      },
      ip,
    );
    this.realtimeService.publish(['productos'], 'movimientos');
    return result;
  }
}
