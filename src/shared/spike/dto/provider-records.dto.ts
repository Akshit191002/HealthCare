import { ApiProperty } from '@nestjs/swagger';

export class ProviderRecordsDto {
  @ApiProperty({ example: 'apple_healthkit' })
  provider_slug: string;
}
