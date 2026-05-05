import { Module } from '@nestjs/common';
import { BajasController } from './bajas.controller';
import { BajasService } from './bajas.service';
import { AuditoriaService } from '../common/auditoria.service';

@Module({
  controllers: [BajasController],
  providers: [BajasService, AuditoriaService],
})
export class BajasModule {}
