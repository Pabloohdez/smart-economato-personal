import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AlergenosService } from './alergenos.service';
import { SaveUserAlergiasDto } from './dto/save-user-alergias.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Controller('alergenos')
export class AlergenosController {
  constructor(
    private readonly alergenosService: AlergenosService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Public()
  @Get()
  async listar() {
    return this.alergenosService.findAll();
  }

  @Get('mine')
  async listarUsuario(@Req() req: AuthenticatedRequest) {
    return this.alergenosService.findUserAlergias(String(req.user?.sub ?? ''));
  }

  @Put('mine')
  async guardarUsuario(
    @Req() req: AuthenticatedRequest,
    @Body() body: SaveUserAlergiasDto,
  ) {
    const result = await this.alergenosService.saveUserAlergias(String(req.user?.sub ?? ''), body.alergias ?? []);
    this.realtimeService.publish(['misAlergias'], 'alergenos');
    return result;
  }
}