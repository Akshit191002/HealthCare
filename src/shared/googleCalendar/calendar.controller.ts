// import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
// import { Response } from 'express';
// import { GoogleService } from './calendar.service';
// import { calendar_v3 } from 'googleapis';

// @Controller('google')
// export class GoogleController {
//     constructor(private readonly googleService: GoogleService) { }

//     @Get('auth')
//     async auth() {
//         const url = this.googleService.getAuthUrl();
//         return { url };
//     }


//     @Get('callback')
//     async callback(@Query('code') code: string) {
//         const tokens = await this.googleService.getTokens(code);
//         return { message: 'Auth success', tokens };
//     }

//     @Get('events')
//     async events(@Query('access_token') accessToken: string) {
//         const events = await this.googleService.getCalendarEvents(accessToken);
//         return { count: events.length, events };
//     }

//     @Post('event')
//     async createEvent(
//         @Query('accessToken') accessToken: string,
//         @Body() event: calendar_v3.Schema$Event,
//     ) {
//         return await this.googleService.createEvent(accessToken, event);
//     }

//     @Put('event/:eventId')
//     async updateEvent(
//         @Query('accessToken') accessToken: string,
//         @Param('eventId') eventId: string,
//         @Body() event: calendar_v3.Schema$Event,
//     ) {
//         return await this.googleService.updateEvent(accessToken, eventId, event);
//     }

//     @Delete('event/:eventId')
//     async deleteEvent(
//         @Query('accessToken') accessToken: string,
//         @Param('eventId') eventId: string,
//     ) {
//         await this.googleService.deleteEvent(accessToken, eventId);
//         return { message: 'Event deleted successfully' };
//     }
// }

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { GoogleService } from './calendar.service';
import { calendar_v3 } from 'googleapis';

@ApiTags('Google Calendar')
@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Get('auth')
  @ApiOperation({ summary: 'Get Google OAuth URL' })
  @ApiResponse({ status: 200, description: 'Returns the Google auth URL' })
  async auth() {
    const url = this.googleService.getAuthUrl();
    return { url };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Google' })
  @ApiResponse({ status: 200, description: 'Returns access and refresh tokens' })
  async callback(@Query('code') code: string) {
    const tokens = await this.googleService.getTokens(code);
    return { message: 'Auth success', tokens };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get calendar events' })
  @ApiQuery({ name: 'access_token', required: true, description: 'Access token from Google' })
  @ApiResponse({ status: 200, description: 'Returns list of calendar events' })
  async events(@Query('access_token') accessToken: string) {
    const events = await this.googleService.getCalendarEvents(accessToken);
    return { count: events.length, events };
  }

  @Post('event')
  @ApiOperation({ summary: 'Create a calendar event' })
  @ApiQuery({ name: 'accessToken', required: true, description: 'Access token from Google' })
  @ApiBody({ description: 'Event object', type: Object })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async createEvent(
    @Query('accessToken') accessToken: string,
    @Body() event: calendar_v3.Schema$Event,
  ) {
    return await this.googleService.createEvent(accessToken, event);
  }

  @Patch('event/:eventId')
  @ApiOperation({ summary: 'Update a calendar event' })
  @ApiParam({ name: 'eventId', description: 'ID of the event to update' })
  @ApiQuery({ name: 'accessToken', required: true, description: 'Access token from Google' })
  @ApiBody({ description: 'Updated event object', type: Object })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  async updateEvent(
    @Query('accessToken') accessToken: string,
    @Param('eventId') eventId: string,
    @Body() event: calendar_v3.Schema$Event,
  ) {
    return await this.googleService.updateEvent(accessToken, eventId, event);
  }

  @Delete('event/:eventId')
  @ApiOperation({ summary: 'Delete a calendar event' })
  @ApiParam({ name: 'eventId', description: 'ID of the event to delete' })
  @ApiQuery({ name: 'accessToken', required: true, description: 'Access token from Google' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  async deleteEvent(
    @Query('accessToken') accessToken: string,
    @Param('eventId') eventId: string,
  ) {
    await this.googleService.deleteEvent(accessToken, eventId);
    return { message: 'Event deleted successfully' };
  }
}
