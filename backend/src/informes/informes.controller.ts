import { Controller, Get, Query, Req } from '@nestjs/common';
import { InformesService } from './informes.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Request } from 'express';
import { AuthenticatedRequest } from '../auth/auth.types';

@Controller('informes')
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Public()
  @Get()
  async get(
    @Query('tipo') tipo: string,
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const t = tipo || 'dashboard';
    const usuarioId = req.user?.sub || undefined;
    if (t === 'gastos_mensuales') {
      const data = await this.informesService.getGastosMensuales(
        usuarioId,
        fechaInicio || undefined,
        fechaFin || undefined,
      );
      return { gastos_por_mes: data.gastos_por_mes, total_curso: data.total_curso };
    }
    if (t === 'usuarios') {
      const data = await this.informesService.getUsuarios();
      return data;
    }
    const data = await this.informesService.getDashboard();
    return data;
  }
}
