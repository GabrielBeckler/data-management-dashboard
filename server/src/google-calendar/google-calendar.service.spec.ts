import { GoogleCalendarService } from './google-calendar.service';

describe('GoogleCalendarService appointment date validation', () => {
  const service = new GoogleCalendarService();
  const now = new Date('2026-09-24T15:00:00.000Z');

  it.each([
    ['30/09', '2026-09-30'],
    ['30-09', '2026-09-30'],
    ['30/09/2026', '2026-09-30'],
    ['2026-09-30', '2026-09-30'],
  ])('accepts %s as %s in Sao Paulo time', (input, expected) => {
    expect(service.parseAppointmentDate(input, now)).toBe(expected);
  });

  it.each(['31/09/2026', '24/09/2025', '25/10/2026', 'not a date'])(
    'rejects invalid, past, and over-30-day date %s',
    (input) => {
      expect(service.parseAppointmentDate(input, now)).toBeNull();
    },
  );
});
