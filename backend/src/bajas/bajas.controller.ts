import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { BajasService } from './bajas.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CreateBajaDto } from './dto/create-baja.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('bajas')
export class BajasController {
  constructor(
    private readonly bajasService: BajasService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get()
  async listar(
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    const mesNum = mes ? parseInt(mes, 10) : undefined;
    const anioNum = anio ? parseInt(anio, 10) : undefined;
    return this.bajasService.findAll(mesNum, anioNum);
  }

  @Get('weekly-percentage')
  async getWeeklyPercentage() {
    return this.bajasService.getWeeklyPercentage();
  }

  @Post()
  async crear(@Body() body: CreateBajaDto, @Req() req: AuthenticatedRequest) {
    const ip = req.socket?.remoteAddress;
    const result = await this.bajasService.crear(
      {
        productoId: body.productoId,
        cantidad: body.cantidad,
        tipoBaja: body.tipoBaja,
        motivo: body.motivo,
        usuarioId: req.user?.sub,
        fechaBaja: body.fechaBaja,
      },
      ip,
    );
    this.realtimeService.publish(['productos'], 'bajas');
    return result;
  }
}
