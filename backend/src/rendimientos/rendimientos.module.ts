import { Module } from '@nestjs/common';
import { RendimientosController } from './rendimientos.controller';
import { RendimientosService } from './rendimientos.service';

@Module({
  controllers: [RendimientosController],
  providers: [RendimientosService],
})
export class RendimientosModule {}
