import { Injectable, Logger } from '@nestjs/common';
import { SquareService } from '../square/square.service';

@Injectable()
export class SquareWebhookService {
  private readonly logger = new Logger(SquareWebhookService.name);

  constructor(
    private readonly squareService: SquareService,
  ) {}

  async handleWebhook(body: any, signature: string) {
    const valid = this.squareService.verifyWebhookSignature(signature, JSON.stringify(body));
    if (!valid) {
      this.logger.warn('Invalid webhook signature');
      return { success: false };
    }

    const { type, data } = body;

    switch (type) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.canceled':
        await this.handleSubscriptionEvent(data);
        break;
      case 'payment.created':
      case 'payment.updated':
        await this.handlePaymentEvent(data);
        break;
      default:
        this.logger.log(`Unhandled Square event type: ${type}`);
    }

    return { success: true };
  }

  private async handleSubscriptionEvent(data: any) {
    this.logger.log(`Handling subscription event: ${JSON.stringify(data)}`);
  }

  private async handlePaymentEvent(data: any) {
    this.logger.log(`Handling payment event: ${JSON.stringify(data)}`);
  }
}
