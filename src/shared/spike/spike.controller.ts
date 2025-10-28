import { Controller, Get, Post, Body, Headers, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { SpikeService } from './spike.service';

@ApiTags('Spike API')
@Controller('spike')
export class SpikeController {
  constructor(private readonly spikeService: SpikeService) { }

  // @Post('provider-integration')
  // @ApiOperation({ summary: 'Create provider integration for a user' })
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       provider_slug: { type: 'string', example: 'apple_healthkit' },
  //       application_user_id: { type: 'string', example: 'user_123' },
  //     },
  //     required: ['provider_slug', 'application_user_id'],
  //   },
  // })
  // async providerIntegration(
  //   @Body('provider_slug') provider_slug: string,
  //   @Body('application_user_id') application_user_id: string,
  // ) {
  //   return this.spikeService.providerIntegration(provider_slug, application_user_id);
  // }

  @Get('provider-url')
  @ApiOperation({ summary: 'Get provider integration URL' })
  @ApiQuery({ name: 'provider_slug', type: 'string', example: 'apple_healthkit' })
  @ApiQuery({ name: 'redirect_uri', type: 'string', required: false })
  @ApiQuery({ name: 'state', type: 'string', required: false })
  @ApiQuery({ name: 'provider_user_id', type: 'string', required: false })
  async getProviderIntegrationUrl(
    @Query('provider_slug') providerSlug: string,
    @Query('redirect_uri') redirectUri?: string,
    @Query('state') state?: string,
    @Query('provider_user_id') providerUserId?: string,
  ) {
    return this.spikeService.getProviderIntegrationUrl(providerSlug, redirectUri, state, providerUserId);
  }

  @Post('authenticate')
  @ApiOperation({ summary: 'Authenticate user with HMAC' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        application_id: { type: 'string', example: 'app_123' },
        application_user_id: { type: 'string', example: 'user_123' },
        secretKey: { type: 'string', example: 'your_spike_secret_key' },
      },
      required: ['application_id', 'application_user_id', 'secretKey'],
    },
  })
  async authenticateUser(
    @Body('application_id') application_id: string,
    @Body('application_user_id') application_user_id: string,
  ) {
    return this.spikeService.authenticateUser(application_id, application_user_id);
  }

  @Get('userinfo')
  @ApiOperation({ summary: 'Get user info' })
  @ApiQuery({ name: 'application_user_id', type: 'string', example: 'user_123' })
  async getUserInfo(
    @Headers('authorization') authHeader: string,
    @Query('application_user_id') application_user_id: string,
  ) {
    const access_token = authHeader?.replace('Bearer ', '');
    return this.spikeService.getUserInfo(access_token, application_user_id);
  }

  @Get('userproperties')
  @ApiOperation({ summary: 'Get user properties' })
  async getUserProperties(@Headers('authorization') authHeader: string) {
    const access_token = authHeader?.replace('Bearer ', '');
    return this.spikeService.getUserProperties(access_token);
  }

  @Get('provider-records')
  @ApiOperation({ summary: 'Fetch health records from provider' })
  @ApiQuery({ name: 'provider_slug', type: 'string', example: 'apple_healthkit' })
  async fetchProviderRecords(
    @Headers('authorization') authHeader: string,
    @Query('provider_slug') provider_slug: string,
  ) {
    const access_token = authHeader?.replace('Bearer ', '');
    return this.spikeService.fetchProviderRecords(access_token, provider_slug);
  }
}
