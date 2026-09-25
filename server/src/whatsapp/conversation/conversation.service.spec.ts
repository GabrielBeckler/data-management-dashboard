import { InMemoryConversationStateStore } from './conversation.state';
import { ConversationService } from './conversation.service';
import {
  AppointmentRecord,
  WhatsAppPersistenceService,
} from '../persistence/whatsapp-persistence.service';
import { GoogleCalendarService } from '../../google-calendar/google-calendar.service';

const appointment: AppointmentRecord = {
  id: 12n,
  clientId: 3n,
  googleEventId: 'event-12',
  name: 'Ana',
  phone: '5531999999999',
  date: '2026-09-30',
  start: '10:00',
  end: '11:00',
  status: 'confirmado',
};

describe('ConversationService', () => {
  let service: ConversationService;
  let stateStore: InMemoryConversationStateStore;
  let calendar: jest.Mocked<GoogleCalendarService>;
  let persistence: jest.Mocked<WhatsAppPersistenceService>;
  const phone = '5531999999999';

  beforeEach(() => {
    stateStore = new InMemoryConversationStateStore();
    calendar = {
      parseAppointmentDate: jest.fn().mockReturnValue('2026-09-30'),
      getAvailableSlots: jest
        .fn()
        .mockResolvedValue([{ start: '10:00', end: '11:00', label: '10:00' }]),
      createAppointment: jest
        .fn()
        .mockResolvedValue({ created: true, eventId: 'event-new' }),
      rescheduleEvent: jest
        .fn()
        .mockResolvedValue({ created: true, eventId: 'event-12' }),
      cancelEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<GoogleCalendarService>;
    persistence = {
      updateCustomerName: jest.fn().mockResolvedValue(undefined),
      createAppointment: jest.fn().mockResolvedValue(99n),
      listFutureAppointments: jest.fn().mockResolvedValue([]),
      cancelAppointment: jest.fn().mockResolvedValue(true),
      updateAppointment: jest.fn().mockResolvedValue(undefined),
      getReminderResponseAppointment: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<WhatsAppPersistenceService>;
    service = new ConversationService(stateStore, calendar, persistence);
  });

  it('books an appointment only after confirmation and persists its Google event ID', async () => {
    await service.processIncomingMessage(phone, '1');
    await service.processIncomingMessage(phone, 'Ana');
    await service.processIncomingMessage(phone, '30/09/2026');
    await service.processIncomingMessage(phone, '1');
    const confirmation = await service.processIncomingMessage(phone, '1');

    expect(calendar.createAppointment).toHaveBeenCalledWith({
      name: 'Ana',
      phone,
      date: '2026-09-30',
      time: '10:00',
    });
    expect(persistence.createAppointment).toHaveBeenCalledWith({
      phone,
      name: 'Ana',
      date: '2026-09-30',
      start: '10:00',
      end: '11:00',
      googleEventId: 'event-new',
    });
    expect(confirmation.join('\n')).toContain('Agendamento confirmado!');
  });

  it('compensates by deleting a Calendar event if its database record fails', async () => {
    persistence.createAppointment.mockRejectedValueOnce(
      new Error('database unavailable'),
    );
    await service.processIncomingMessage(phone, '1');
    await service.processIncomingMessage(phone, 'Ana');
    await service.processIncomingMessage(phone, '30/09/2026');
    await service.processIncomingMessage(phone, '1');
    const reply = await service.processIncomingMessage(phone, '1');

    expect(calendar.cancelEvent).toHaveBeenCalledWith('event-new');
    expect(reply.join('\n')).not.toContain('Agendamento confirmado!');
  });

  it('returns newly available slots when the selected time is occupied before confirmation', async () => {
    calendar.createAppointment.mockResolvedValueOnce({
      created: false,
      availableSlots: [{ start: '11:00', end: '12:00', label: '11:00' }],
    });
    await service.processIncomingMessage(phone, '1');
    await service.processIncomingMessage(phone, 'Ana');
    await service.processIncomingMessage(phone, '30/09/2026');
    await service.processIncomingMessage(phone, '1');
    const reply = await service.processIncomingMessage(phone, '1');

    expect(reply.join('\n')).toContain('Esse horário acabou de ser ocupado.');
    expect(reply.join('\n')).toContain('1 - 11:00');
    expect(reply.join('\n')).not.toContain('Agendamento confirmado!');
  });

  it('lists appointments and handles an empty future list', async () => {
    const reply = await service.processIncomingMessage(phone, '3');
    expect(reply[0]).toBe('Você não possui atendimentos agendados.');
    persistence.listFutureAppointments.mockResolvedValueOnce([appointment]);
    const withAppointment = await service.processIncomingMessage(phone, '3');
    expect(withAppointment[0]).toContain('30/09/2026 às 10:00');
  });

  it('cancels the Google event and then marks the appointment cancelled', async () => {
    persistence.listFutureAppointments.mockResolvedValue([appointment]);
    await service.processIncomingMessage(phone, '5');
    const reply = await service.processIncomingMessage(phone, '1');
    expect(calendar.cancelEvent).toHaveBeenCalledWith('event-12');
    expect(persistence.cancelAppointment).toHaveBeenCalledWith(12n, phone);
    expect(reply.join('\n')).toContain('Seu atendimento foi cancelado.');
  });

  it('reschedules the existing Google event and updates the appointment row', async () => {
    persistence.listFutureAppointments.mockResolvedValue([appointment]);
    await service.processIncomingMessage(phone, '4');
    await service.processIncomingMessage(phone, '1');
    await service.processIncomingMessage(phone, '15/10/2026');
    await service.processIncomingMessage(phone, '1');
    const reply = await service.processIncomingMessage(phone, '1');

    expect(calendar.getAvailableSlots).toHaveBeenCalledWith(
      '2026-09-30',
      'event-12',
    );
    expect(calendar.rescheduleEvent).toHaveBeenCalledWith('event-12', {
      name: 'Ana',
      phone,
      date: '2026-09-30',
      time: '10:00',
    });
    expect(persistence.updateAppointment).toHaveBeenCalledWith(12n, phone, {
      date: '2026-09-30',
      start: '10:00',
      end: '11:00',
      googleEventId: 'event-12',
    });
    expect(reply.join('\n')).toContain('Reagendamento confirmado!');
  });

  it('returns address followed by the main menu and resets conversation state', async () => {
    const replies = await service.processIncomingMessage(phone, '2');
    expect(replies[0]).toContain('Rua dos Bobos');
    expect(replies[1]).toContain('1 - Agendar atendimento');
    expect(stateStore.get(phone)?.step).toBe('initial');
  });

  it('uses a sent reminder to disambiguate a numeric confirmation response', async () => {
    persistence.getReminderResponseAppointment.mockResolvedValueOnce(
      appointment,
    );
    const reply = await service.processIncomingMessage(phone, '1');
    expect(reply[0]).toContain('continua agendado');
  });
});
