import { Module } from '@nestjs/common';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { AuditoriaService } from '../common/auditoria.service';

@Module({
  controllers: [MovimientosController],
  providers: [MovimientosService, AuditoriaService],
})
export class MovimientosModule {}
