import { ApiProperty } from '@nestjs/swagger';

export class ProviderIntegrationDto {
  @ApiProperty({ example: 'apple_healthkit' })
  provider_slug: string;

  @ApiProperty({ example: 'user_123' })
  application_user_id: string;
}
