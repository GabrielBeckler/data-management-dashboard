import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WhatsAppDelayService } from '../delay.service';
import {
  WhatsAppPersistenceService,
  REMINDER_TYPE,
} from '../persistence/whatsapp-persistence.service';
import { WhatsAppClient } from '../whatsapp.client';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    private readonly persistence: WhatsAppPersistenceService,
    private readonly whatsappClient: WhatsAppClient,
    private readonly delay: WhatsAppDelayService,
  ) {}

  @Cron(process.env.REMINDER_CRON ?? '0 9 * * *', {
    timeZone: 'America/Sao_Paulo',
  })
  async sendTomorrowReminders(): Promise<void> {
    let appointments;
    try {
      appointments =
        await this.persistence.getTomorrowAppointmentsForReminder();
    } catch {
      this.logger.error('Could not load appointments for reminders');
      return;
    }

    for (const appointment of appointments) {
      let reminderId: bigint | null;
      try {
        reminderId = await this.persistence.claimReminder(appointment.id);
      } catch {
        this.logger.error('Could not reserve reminder record');
        continue;
      }
      if (reminderId === null) continue;

      const date = this.displayDate(appointment.date);
      const text = [
        `Olá, ${appointment.name}!`,
        '',
        'Você tem um atendimento amanhã.',
        '',
        `Data: ${date}`,
        `Horário: ${appointment.start}`,
        '',
        '1 - Confirmar',
        '2 - Cancelar',
      ].join('\n');

      try {
        await this.delay.wait();
        const sent = await this.whatsappClient.sendMessage(
          appointment.phone,
          text,
        );
        if (!sent) {
          await this.persistence.releaseReminderClaim(reminderId);
          this.logger.warn('WhatsApp did not send an appointment reminder');
          continue;
        }
        await this.persistence.markReminderSent(reminderId);
        await this.persistence.saveMessage(appointment.phone, text, 'saida');
      } catch {
        // Keep the unique reminder claimed if delivery may already have happened.
        this.logger.error('Appointment reminder delivery or recording failed');
      }
    }

    this.logger.log(`Processed ${appointments.length} reminder candidate(s)`);
  }

  private displayDate(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }
}
