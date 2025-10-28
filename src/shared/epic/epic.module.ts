import { Module } from '@nestjs/common';
import { EpicService } from './epic.service';
import { EpicController } from './epic.controller';

@Module({
  providers: [EpicService],
  controllers: [EpicController],
})
export class EpicModule {}
