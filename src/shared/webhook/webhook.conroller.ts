import { Controller, Post, Headers, Req, HttpCode } from '@nestjs/common';
import { SquareWebhookService } from './webhook.service';

@Controller('square/webhook')
export class SquareWebhookController {
  constructor(private readonly webhookService: SquareWebhookService) {}

  @Post()
  @HttpCode(200)
  async receiveWebhook(@Req() req, @Headers('x-square-signature') signature: string) {
    console.log('Raw body:', req.rawBody);
    return this.webhookService.handleWebhook(req.rawBody, signature);
  }
}
