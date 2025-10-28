import { Module } from '@nestjs/common';
import { SquareService } from '../square/square.service';
import { SquareWebhookController } from './webhook.conroller';
import { SquareWebhookService } from './webhook.service';

@Module({
  controllers: [SquareWebhookController],
  providers: [SquareWebhookService, SquareService],
})
export class SquareWebhookModule {}
