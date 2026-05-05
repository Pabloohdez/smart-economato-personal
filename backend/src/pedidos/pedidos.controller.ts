import { Body, Controller, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreatePedidoDto, UpdatePedidoDto } from './dto/pedido.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('pedidos')
export class PedidosController {
  constructor(
    private readonly pedidosService: PedidosService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get()
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const l = limit ? parseInt(limit, 10) : undefined;
    return this.pedidosService.findAll(p, l);
  }

  @Get('pending-today-count')
  async getPendingTodayCount() {
    return this.pedidosService.getPendingTodayCount();
  }

  @Get(':id')
  async uno(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID inválido', HttpStatus.BAD_REQUEST);
    const pedido = await this.pedidosService.findOne(numId);
    if (!pedido) throw new HttpException('Pedido no encontrado', HttpStatus.NOT_FOUND);
    return pedido;
  }

  @Post()
  async crear(@Body() body: CreatePedidoDto, @Req() req: AuthenticatedRequest) {
    const result = await this.pedidosService.crear({
      proveedorId: body.proveedorId,
      total: body.total ?? 0,
      usuarioId: req.user?.sub,
      items: body.items,
    });
    this.realtimeService.publish(['pedidos', 'pedidosPendientes', 'informesGastosMensuales'], 'pedidos');
    return result;
  }

  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() body: UpdatePedidoDto) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('Falta ID', HttpStatus.BAD_REQUEST);
    const result = await this.pedidosService.actualizar(numId, body);
    this.realtimeService.publish(
      body.accion === 'RECIBIR'
        ? ['pedidos', 'pedidosPendientes', 'productos']
        : ['pedidos', 'pedidosPendientes'],
      'pedidos',
    );
    return result;
  }
}
