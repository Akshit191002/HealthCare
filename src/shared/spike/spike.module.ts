import { Module } from '@nestjs/common';
import { SpikeService } from './spike.service';
import { SpikeController } from './spike.controller';

@Module({
  providers: [SpikeService],
  controllers: [SpikeController],
  exports: [SpikeService], 
})
export class SpikeModule {}
