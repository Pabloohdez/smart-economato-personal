import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LotesController } from './lotes.controller';
import { LotesService } from './lotes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LotesController],
  providers: [LotesService],
})
export class LotesModule {}

