import { Module } from '@nestjs/common';
import { AlergenosController } from './alergenos.controller';
import { AlergenosService } from './alergenos.service';

@Module({
  controllers: [AlergenosController],
  providers: [AlergenosService],
  exports: [AlergenosService],
})
export class AlergenosModule {}