import { Module } from '@nestjs/common';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaControllerService } from './auditoria.controller.service';

@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaControllerService],
})
export class AuditoriaModule {}
