import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { EscandallosService } from './escandallos.service';
import { SaveEscandalloDto } from './dto/save-escandallo.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('escandallos')
export class EscandallosController {
  constructor(
    private readonly escandallosService: EscandallosService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Get()
  async listar() {
    return this.escandallosService.findAll();
  }

  @Post()
  async crear(@Req() req: AuthenticatedRequest, @Body() body: SaveEscandalloDto) {
    const result = await this.escandallosService.create(body, String(req.user?.sub ?? ''));
    this.realtimeService.publish(['escandallos'], 'escandallos');
    return result;
  }

  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: SaveEscandalloDto,
  ) {
    const result = await this.escandallosService.update(Number(id), body, String(req.user?.sub ?? ''));
    this.realtimeService.publish(['escandallos'], 'escandallos');
    return result;
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    const result = await this.escandallosService.remove(Number(id));
    this.realtimeService.publish(['escandallos'], 'escandallos');
    return result;
  }
}