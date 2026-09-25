import { ReminderSchedulerService } from './reminder-scheduler.service';
import { WhatsAppPersistenceService } from '../persistence/whatsapp-persistence.service';
import { WhatsAppClient } from '../whatsapp.client';
import { WhatsAppDelayService } from '../delay.service';

describe('ReminderSchedulerService', () => {
  const appointment = {
    id: 3n,
    clientId: 1n,
    googleEventId: 'event-3',
    name: 'Ana',
    phone: '5531999999999',
    date: '2026-10-01',
    start: '10:30',
    end: '11:30',
    status: 'confirmado',
  };
  const persistence = {
    getTomorrowAppointmentsForReminder: jest.fn(),
    claimReminder: jest.fn(),
    releaseReminderClaim: jest.fn(),
    markReminderSent: jest.fn(),
    saveMessage: jest.fn(),
  } as unknown as jest.Mocked<WhatsAppPersistenceService>;
  const whatsapp = {
    sendMessage: jest.fn(),
  } as unknown as jest.Mocked<WhatsAppClient>;
  const delay = {
    wait: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WhatsAppDelayService>;

  beforeEach(() => {
    jest.clearAllMocks();
    persistence.getTomorrowAppointmentsForReminder.mockResolvedValue([
      appointment,
    ]);
    persistence.claimReminder.mockResolvedValue(20n);
    whatsapp.sendMessage.mockResolvedValue(true);
  });

  it('sends, records, and marks a claimed reminder', async () => {
    const service = new ReminderSchedulerService(persistence, whatsapp, delay);
    await service.sendTomorrowReminders();
    expect(whatsapp.sendMessage).toHaveBeenCalledWith(
      appointment.phone,
      expect.stringContaining('2 - Cancelar'),
    );
    expect(persistence.markReminderSent).toHaveBeenCalledWith(20n);
    expect(persistence.saveMessage).toHaveBeenCalledWith(
      appointment.phone,
      expect.stringContaining('Você tem um atendimento amanhã.'),
      'saida',
    );
  });

  it('does not send an appointment reminder that was already claimed', async () => {
    persistence.claimReminder.mockResolvedValue(null);
    const service = new ReminderSchedulerService(persistence, whatsapp, delay);
    await service.sendTomorrowReminders();
    expect(whatsapp.sendMessage).not.toHaveBeenCalled();
  });

  it('releases the reminder claim if WhatsApp reports a delivery failure', async () => {
    whatsapp.sendMessage.mockResolvedValue(false);
    const service = new ReminderSchedulerService(persistence, whatsapp, delay);
    await service.sendTomorrowReminders();
    expect(persistence.releaseReminderClaim).toHaveBeenCalledWith(20n);
    expect(persistence.markReminderSent).not.toHaveBeenCalled();
  });
});
