import { Injectable } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { AppointmentSlot } from '../whatsapp/whatsapp.types';

export interface AppointmentRequest {
  name: string;
  phone: string;
  date: string;
  time: string;
}

export type CreateAppointmentResult =
  | { created: true; eventId?: string }
  | { created: false; availableSlots: AppointmentSlot[] };

@Injectable()
export class GoogleCalendarService {
  private calendarApi: calendar_v3.Calendar | null = null;

  getTimezone(): string {
    return process.env.CALENDAR_TIMEZONE || 'America/Sao_Paulo';
  }

  parseAppointmentDate(input: string, now = new Date()): string | null {
    const dateMatch = input.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?$/);
    const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let year: number;
    let month: number;
    let day: number;

    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]);
      day = Number(isoMatch[3]);
    } else if (dateMatch) {
      day = Number(dateMatch[1]);
      month = Number(dateMatch[2]);
      year = dateMatch[3]
        ? Number(dateMatch[3])
        : this.localDateParts(now, this.getTimezone()).year;
      if (!dateMatch[3]) {
        const today = this.localDateParts(now, this.getTimezone());
        const candidate = this.dateOrdinal(year, month, day);
        if (candidate < this.dateOrdinal(today.year, today.month, today.day)) {
          year += 1;
        }
      }
    } else {
      return null;
    }

    if (!this.isValidDate(year, month, day)) return null;

    const today = this.localDateParts(now, this.getTimezone());
    const selectedDay = this.dateOrdinal(year, month, day);
    const todayOrdinal = this.dateOrdinal(today.year, today.month, today.day);
    if (selectedDay < todayOrdinal || selectedDay > todayOrdinal + 30) return null;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  async getAvailableSlots(date: string): Promise<AppointmentSlot[]> {
    const config = this.getScheduleConfig();
    const { timeMin, timeMax } = this.getDayBounds(date, config.timezone);
    const response = await this.getCalendar().events.list({
      calendarId: this.getCalendarId(),
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = response.data.items ?? [];
    const slots: AppointmentSlot[] = [];
    const startMinute = this.parseClock(config.startTime);
    const endMinute = this.parseClock(config.endTime);

    for (
      let minute = startMinute;
      minute + config.durationMinutes <= endMinute;
      minute += config.intervalMinutes
    ) {
      const startClock = this.formatClock(minute);
      const endClock = this.formatClock(minute + config.durationMinutes);
      const start = this.localTimeToUtc(date, startClock, config.timezone);
      const end = this.localTimeToUtc(date, endClock, config.timezone);
      const busy = events.some((event) =>
        event.status !== 'cancelled' &&
        event.transparency !== 'transparent' &&
        this.eventOverlaps(event, start, end, config.timezone),
      );
      if (!busy && start.getTime() > Date.now()) {
        slots.push({ start: startClock, end: endClock, label: startClock });
      }
    }
    return slots;
  }

  async createAppointment(
    request: AppointmentRequest,
  ): Promise<CreateAppointmentResult> {
    const availableSlots = await this.getAvailableSlots(request.date);
    if (!availableSlots.some((slot) => slot.start === request.time)) {
      return { created: false, availableSlots };
    }

    const config = this.getScheduleConfig();
    const start = this.localTimeToUtc(request.date, request.time, config.timezone);
    const end = new Date(start.getTime() + config.durationMinutes * 60_000);
    const response = await this.getCalendar().events.insert({
      calendarId: this.getCalendarId(),
      requestBody: {
        summary: `Atendimento - ${request.name}`,
        description: [
          'Agendamento realizado pelo WhatsApp.',
          '',
          `Cliente: ${request.name}`,
          `Telefone: ${request.phone}`,
        ].join('\n'),
        start: { dateTime: start.toISOString(), timeZone: config.timezone },
        end: { dateTime: end.toISOString(), timeZone: config.timezone },
      },
    });
    return { created: true, eventId: response.data.id ?? undefined };
  }

  private getCalendar(): calendar_v3.Calendar {
    if (this.calendarApi) return this.calendarApi;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
      throw new Error('Google Calendar OAuth is not fully configured in the environment.');
    }

    const oauthClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauthClient.setCredentials({ refresh_token: refreshToken });
    this.calendarApi = google.calendar({ version: 'v3', auth: oauthClient });
    return this.calendarApi;
  }

  private getCalendarId(): string {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID is not configured.');
    return calendarId;
  }

  private getScheduleConfig(): {
    timezone: string;
    durationMinutes: number;
    intervalMinutes: number;
    startTime: string;
    endTime: string;
  } {
    const timezone = this.getTimezone();
    const durationMinutes = Number(process.env.APPOINTMENT_DURATION_MINUTES);
    const intervalMinutes = Number(process.env.APPOINTMENT_INTERVAL_MINUTES);
    const startTime = process.env.APPOINTMENT_START_TIME;
    const endTime = process.env.APPOINTMENT_END_TIME;
    if (
      !Number.isInteger(durationMinutes) || durationMinutes <= 0 ||
      !Number.isInteger(intervalMinutes) || intervalMinutes <= 0 ||
      !startTime || !endTime
    ) {
      throw new Error('Appointment schedule environment variables are missing or invalid.');
    }
    const startMinute = this.parseClock(startTime);
    const endMinute = this.parseClock(endTime);
    if (startMinute >= endMinute) throw new Error('Appointment hours are invalid.');
    return { timezone, durationMinutes, intervalMinutes, startTime, endTime };
  }

  private eventOverlaps(
    event: calendar_v3.Schema$Event,
    slotStart: Date,
    slotEnd: Date,
    timezone: string,
  ): boolean {
    const eventStart = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
        ? this.localTimeToUtc(event.start.date, '00:00', timezone)
        : null;
    const eventEnd = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
        ? this.localTimeToUtc(event.end.date, '00:00', timezone)
        : null;
    if (!eventStart || !eventEnd) return false;
    return slotStart < eventEnd && slotEnd > eventStart;
  }

  private getDayBounds(date: string, timezone: string): { timeMin: Date; timeMax: Date } {
    const [year, month, day] = date.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
    return {
      timeMin: this.localTimeToUtc(date, '00:00', timezone),
      timeMax: this.localTimeToUtc(nextDate, '00:00', timezone),
    };
  }

  private localTimeToUtc(date: string, time: string, timezone: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const target = Date.UTC(year, month - 1, day, hour, minute);
    let result = target;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parts = this.localDateTimeParts(new Date(result), timezone);
      const represented = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
      );
      result += target - represented;
    }
    return new Date(result);
  }

  private localDateParts(date: Date, timezone: string): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    return {
      year: Number(parts.find((part) => part.type === 'year')?.value),
      month: Number(parts.find((part) => part.type === 'month')?.value),
      day: Number(parts.find((part) => part.type === 'day')?.value),
    };
  }

  private localDateTimeParts(
    date: Date,
    timezone: string,
  ): { year: number; month: number; day: number; hour: number; minute: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute') };
  }

  private isValidDate(year: number, month: number, day: number): boolean {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  private dateOrdinal(year: number, month: number, day: number): number {
    return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  }

  private parseClock(time: string): number {
    const match = time.match(/^(\d{2}):([0-5]\d)$/);
    if (!match || Number(match[1]) > 23) throw new Error(`Invalid appointment time: ${time}`);
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private formatClock(minutes: number): string {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
}
