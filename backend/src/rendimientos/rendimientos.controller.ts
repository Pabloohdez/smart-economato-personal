import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RendimientosService } from './rendimientos.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateRendimientoDto } from './create-rendimiento.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('rendimientos')
export class RendimientosController {
  constructor(
    private readonly rendimientosService: RendimientosService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Public()
  @Get()
  async listar(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 100;
    return this.rendimientosService.findAll(isNaN(n) ? 100 : n);
  }

  @Roles('admin')
  @Post()
  async crear(@Body() body: CreateRendimientoDto | CreateRendimientoDto[]) {
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0) {
      throw new HttpException('No hay datos para guardar', HttpStatus.BAD_REQUEST);
    }
    const result = await this.rendimientosService.crear(items as any);
    this.realtimeService.publish(['rendimientosHistorial'], 'rendimientos');
    return result;
  }

  @Roles('admin')
  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID inválido', HttpStatus.BAD_REQUEST);
    const result = await this.rendimientosService.eliminar(numId);
    this.realtimeService.publish(['rendimientosHistorial'], 'rendimientos');
    return result;
  }
}
