import { Injectable } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';

@Injectable()
export class GoogleService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
    });
  }

  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async getCalendarEvents(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items || [];
  }

  private getAuthClient(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return auth;
  }

  async createEvent(accessToken: string, event: calendar_v3.Schema$Event): Promise<calendar_v3.Schema$Event | string> {
    const auth = this.getAuthClient(accessToken);
    const calendar = google.calendar({ version: 'v3', auth });

    if (!event.start || !event.start.dateTime || !event.end || !event.end.dateTime) {
      throw new Error('Event start and end dateTime must be defined');
    }

    const freeBusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: event.start.dateTime,
        timeMax: event.end.dateTime,
        items: [{ id: 'primary' }],
      },
    });

    const busySlots = freeBusyRes.data.calendars?.primary?.busy || [];

    if (busySlots.length > 0) {
      return 'Event already exists in this time range';
    }

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
      conferenceDataVersion: 1
    });
    return res.data;
  }

  async updateEvent(accessToken: string, eventId: string, updates: Partial<calendar_v3.Schema$Event>): Promise<calendar_v3.Schema$Event> {
    const auth = this.getAuthClient(accessToken);
    const calendar = google.calendar({ version: 'v3', auth });

    const existingEventRes = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });
    const existingEvent = existingEventRes.data;

    const updatedEvent: calendar_v3.Schema$Event = {
      ...existingEvent,
      ...updates,
      start: updates.start || existingEvent.start,
      end: updates.end || existingEvent.end,
      attendees: updates.attendees || existingEvent.attendees,
      reminders: updates.reminders || existingEvent.reminders,
      conferenceData: updates.conferenceData || existingEvent.conferenceData,
      extendedProperties: updates.extendedProperties || existingEvent.extendedProperties,
    };

    const res = await calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: updatedEvent,
      sendUpdates: 'all',
      conferenceDataVersion: 1,
    });

    return res.data;
  }


  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const auth = this.getAuthClient(accessToken);
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }

}