import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Public()
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('error-500')
  error500() {
    throw new InternalServerErrorException('Error 500 de prueba');
  }
}
